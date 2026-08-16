import { Fragment, useEffect, useState } from 'react'
import { api, EventLog } from '../api'
import { useAccountContext } from '../components/AccountContext'

interface EventsPage {
  items: EventLog[]
  hasMore: boolean
}

const ENTITY_LABELS: Record<string, string> = {
  order: 'Order',
  service: 'Service',
  'service-image': 'Service image',
  project: 'Project',
  category: 'Category',
  location: 'Location',
  material: 'Material',
  customer: 'Customer',
  company: 'Company',
  'api-key': 'API key',
  'api-domain': 'API domain',
  user: 'User',
  address: 'Address',
  authorize: 'Authorization',
  mail: 'Email',
}

const ACCOUNT_PATH_RE = /^\/api\/v1\/account\/[^/]+/

function apiPayload(e: EventLog): Record<string, unknown> {
  return (e.payload ?? {}) as Record<string, unknown>
}

function requestPath(e: EventLog): string {
  const path = apiPayload(e).path as string | undefined
  if (!path) return e.entity_label || '—'
  return path.replace(ACCOUNT_PATH_RE, '') || '/'
}

function apiSuccess(e: EventLog): boolean {
  const status = apiPayload(e).status as number | undefined
  return typeof status === 'number' && status >= 200 && status < 300
}

function authSuccess(e: EventLog): boolean {
  return e.action === 'login' || e.action === 'code-sent'
}

function mailSuccess(e: EventLog): boolean {
  return e.action === 'sent'
}

function mailTo(e: EventLog): string {
  const to = apiPayload(e).to
  return Array.isArray(to) ? to.join(', ') : ''
}

const JSON_TOKEN_RE =
  /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g

function highlightJson(json: string): string {
  return json.replace(
    JSON_TOKEN_RE,
    (match, key: string | undefined, colon: string | undefined, literal: string | undefined, num: string | undefined) => {
      if (colon !== undefined) return `<span class="j-key">${key}</span>${colon}`
      if (key) return `<span class="j-str">${key}</span>`
      if (literal) return `<span class="j-lit">${literal}</span>`
      if (num !== undefined) return `<span class="j-num">${num}</span>`
      return match
    },
  )
}

function renderPayloadJson(payload: Record<string, unknown>, responseOpen: boolean): string {
  const copy: Record<string, unknown> = { ...payload }
  const response = copy.response
  if (typeof response === 'string' && response) {
    if (responseOpen) {
      try {
        copy.response = JSON.parse(response)
      } catch {
        // keep raw string
      }
    } else {
      copy.response = `… (${response.length} chars)`
    }
  }
  let html = highlightJson(JSON.stringify(copy, null, 2))
  const marker = '<span class="j-key">"response"</span>:'
  const idx = html.indexOf(marker)
  if (idx !== -1) {
    const status = typeof copy.status === 'number' ? copy.status : ''
    const toggle =
      `<span class="response-toggle-text" title="HTTP ${status} — ${responseOpen ? 'Collapse' : 'Expand'} response" ` +
      `onclick="window.__toggleLogResponse()">[${responseOpen ? '−' : '+'}]</span>`
    html = html.slice(0, idx + marker.length) + ' ' + toggle + html.slice(idx + marker.length)
  }
  return html
}

export default function Logs() {
  const { account } = useAccountContext()
  const accountId = account?.uuid ?? ''
  const [tab, setTab] = useState<'general' | 'api' | 'authorize' | 'mail'>('general')
  const [items, setItems] = useState<EventLog[]>([])
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [before, setBefore] = useState<number | undefined>(undefined)
  const [after, setAfter] = useState<number | undefined>(undefined)
  const [hasMore, setHasMore] = useState(false)
  const [canPrev, setCanPrev] = useState(false)
  const [loading, setLoading] = useState(false)
  const [responseOpen, setResponseOpen] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [actorName, setActorName] = useState('')
  const [actorOptions, setActorOptions] = useState<string[]>([])

  const resetPagination = () => {
    setBefore(undefined)
    setAfter(undefined)
    setExpanded(null)
    setResponseOpen(false)
  }

  useEffect(() => {
    if (!accountId) return
    setLoading(true)
    api
      .events(
        accountId,
        tab,
        before,
        after,
        dateFrom || undefined,
        dateTo || undefined,
        actorName || undefined,
      )
      .then((page: EventsPage) => {
        setItems(page.items)
        setHasMore(page.hasMore)
        setCanPrev(before !== undefined)
        setActorOptions((prev) => {
          const next = new Set(prev)
          for (const it of page.items) if (it.actor) next.add(it.actor)
          return [...next]
        })
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [accountId, tab, before, after, dateFrom, dateTo, actorName])

  useEffect(() => {
    const w = window as unknown as { __toggleLogResponse?: () => void }
    w.__toggleLogResponse = () => setResponseOpen((o) => !o)
    return () => {
      delete w.__toggleLogResponse
    }
  }, [])

  const goNext = () => {
    const last = items[items.length - 1]
    if (!last || !hasMore) return
    setBefore(last.id)
    setAfter(undefined)
    setExpanded(null)
  }

  const goPrev = () => {
    const first = items[0]
    if (!first || !canPrev) return
    setAfter(first.id)
    setBefore(undefined)
    setExpanded(null)
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Logs</h1>
          <p className="page-subtitle no-margin">Events recorded for every operation on your entities.</p>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="tabs">
        <button
          type="button"
          className={tab === 'general' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setTab('general')}
        >
          General
        </button>
        <button
          type="button"
          className={tab === 'api' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setTab('api')}
        >
          API
        </button>
        <button
          type="button"
          className={tab === 'authorize' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setTab('authorize')}
        >
          Authorize
        </button>
        <button
          type="button"
          className={tab === 'mail' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setTab('mail')}
        >
          Mail
        </button>
      </div>

      <div className="logs-filters">
        <label>
          From
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value)
              resetPagination()
            }}
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value)
              resetPagination()
            }}
          />
        </label>
        <label>
          Actor
          <select
            value={actorName}
            onChange={(e) => {
              setActorName(e.target.value)
              resetPagination()
            }}
          >
            <option value="">All</option>
            {actorOptions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        {(dateFrom || dateTo || actorName) && (
          <button
            type="button"
            className="btn-sm"
            onClick={() => {
              setDateFrom('')
              setDateTo('')
              setActorName('')
              resetPagination()
            }}
          >
            Reset
          </button>
        )}
      </div>

      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              {(tab === 'api' || tab === 'authorize' || tab === 'mail') && <th />}
              {tab === 'api' ? (
                <>
                  <th>Date &amp; time</th>
                  <th>Method</th>
                  <th>IP</th>
                  <th>Object</th>
                </>
              ) : tab === 'authorize' ? (
                <>
                  <th>Date &amp; time</th>
                  <th>Actor</th>
                  <th>Object</th>
                  <th>IP</th>
                </>
              ) : tab === 'mail' ? (
                <>
                  <th>Date &amp; time</th>
                  <th>To</th>
                  <th>Subject</th>
                  <th>Channel</th>
                </>
              ) : (
                <>
                  <th>Date &amp; time</th>
                  <th>Actor</th>
                  <th>Entity</th>
                  <th>Object</th>
                </>
              )}
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((e) => {
              const p = apiPayload(e)
              return (
                <Fragment key={e.id}>
                  <tr
                    title={tab === 'api' ? `HTTP ${String(p.status ?? '')}` : undefined}
                    className={expanded === e.id ? 'expanded-row' : undefined}
                  >
                    {(tab === 'api' || tab === 'authorize' || tab === 'mail') && (
                      <td className="status-cell">
                        {tab === 'api' ? (
                          <span
                            className={`status-icon ${apiSuccess(e) ? 'status-ok' : 'status-err'}`}
                            title={`HTTP ${String(p.status ?? '')}`}
                          >
                            {apiSuccess(e) ? '✓' : '✗'}
                          </span>
                        ) : tab === 'authorize' ? (
                          <span
                            className={`status-icon ${authSuccess(e) ? 'status-ok' : 'status-err'}`}
                            title={e.action}
                          >
                            {authSuccess(e) ? '✓' : '✗'}
                          </span>
                        ) : (
                          <span
                            className={`status-icon ${mailSuccess(e) ? 'status-ok' : 'status-err'}`}
                            title={e.action}
                          >
                            {mailSuccess(e) ? '✓' : '✗'}
                          </span>
                        )}
                      </td>
                    )}
                    {tab === 'api' ? (
                      <>
                        <td>{new Date(e.created_at).toLocaleString()}</td>
                        <td>{String(p.method ?? '—')}</td>
                        <td>{String(p.ip ?? '—')}</td>
                        <td>{requestPath(e)}</td>
                      </>
                    ) : tab === 'authorize' ? (
                      <>
                        <td>{new Date(e.created_at).toLocaleString()}</td>
                        <td>{e.actor ?? '—'}</td>
                        <td>{e.entity_label || '—'}</td>
                        <td>{String(p.ip ?? '—')}</td>
                      </>
                    ) : tab === 'mail' ? (
                      <>
                        <td>{new Date(e.created_at).toLocaleString()}</td>
                        <td>{mailTo(e) || '—'}</td>
                        <td>{e.entity_label || '—'}</td>
                        <td>{String(p.channel ?? '—')}</td>
                      </>
                    ) : (
                      <>
                        <td>{new Date(e.created_at).toLocaleString()}</td>
                        <td>{e.actor ?? '—'}</td>
                        <td>{ENTITY_LABELS[e.entity] ?? e.entity}</td>
                        <td>{e.entity_label || '—'}</td>
                      </>
                    )}
                    <td>
                      <button
                        type="button"
                        className="btn-sm"
                        onClick={() => {
                          setExpanded(expanded === e.id ? null : e.id)
                          setResponseOpen(false)
                        }}
                      >
                        {expanded === e.id ? 'Hide' : 'Details'}
                      </button>
                    </td>
                  </tr>
                  {expanded === e.id && (
                      <tr>
                        <td colSpan={tab === 'general' ? 5 : 6}>
                          {tab === 'api' && (
                            <div className="log-response">
                              <strong>Response {String(p.status ?? '')}</strong>
                            </div>
                          )}
                          <pre
                            className="log-payload"
                            dangerouslySetInnerHTML={{
                              __html: renderPayloadJson(apiPayload(e), responseOpen),
                            }}
                          />
                        </td>
                      </tr>
                    )}
                </Fragment>
              )
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={tab === 'general' ? 5 : 6} className="empty">
                  {error ? 'Failed to load logs.' : 'No events yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="logs-nav">
        <button type="button" className="btn-sm" onClick={goPrev} disabled={!canPrev || loading}>
          ← Prev
        </button>
        <span className="logs-nav-info">{loading ? 'Loading…' : `${items.length} events`}</span>
        <button type="button" className="btn-sm" onClick={goNext} disabled={!hasMore || loading}>
          Next →
        </button>
      </div>
    </>
  )
}