import { FormEvent, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, Location, Service } from '../api'
import Breadcrumbs from '../components/Breadcrumbs'
import TagInput from '../components/TagInput'
import { useAccountContext } from '../components/AccountContext'
import { useAccountBase } from '../lib/account'

const typeLabel = (type: string) => type.charAt(0).toUpperCase() + type.slice(1)

function subtitleFor(item: Location): string {
  const parts = item.full_location
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
  const withoutTitle = parts.filter((p) => p.toLowerCase() !== item.location.toLowerCase())
  return (withoutTitle.length === parts.length ? withoutTitle.slice(0, -1) : withoutTitle).join(', ')
}

export default function LocationDetail() {
  const { id } = useParams()
  const locationId = Number(id)
  const base = useAccountBase()
  const { account } = useAccountContext()
  const accountId = account?.uuid ?? ''

  const [item, setItem] = useState<Location | null>(null)
  const [error, setError] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [editDescription, setEditDescription] = useState('')
  const [editTags, setEditTags] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [editError, setEditError] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [services, setServices] = useState<Service[]>([])
  const [addBusy, setAddBusy] = useState(false)
  const [addError, setAddError] = useState('')
  const [tipOpen, setTipOpen] = useState(false)
  const [tipStyle, setTipStyle] = useState<{ top: number; left: number } | null>(null)
  const fieldRef = useRef<HTMLDivElement | null>(null)
  const [datesOpen, setDatesOpen] = useState(false)

  const openTip = () => {
    const el = fieldRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setTipStyle({ top: r.top - 8, left: r.right + 12 })
    setTipOpen(true)
  }

  const closeTip = () => setTipOpen(false)

  useEffect(() => {
    if (!locationId) {
      setError('Location not found.')
      return
    }
    api
      .location(locationId, accountId)
      .then(setItem)
      .catch((e) => setError(e.message))
  }, [locationId, accountId])

  function openAdd() {
    setAddError('')
    setAddOpen(true)
    api
      .services(accountId)
      .then(setServices)
      .catch((e) => setAddError(e.message))
  }

  async function addService(s: Service) {
    if (!item || addBusy) return
    setAddBusy(true)
    setAddError('')
    try {
      await api.updateLocation(item.id, {
        location_services: [
          ...item.service_links.map((l) => ({ service_id: l.service_id })),
          { service_id: s.id },
        ],
      }, accountId)
      const updated = await api.location(item.id, accountId)
      setItem(updated)
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add service')
    } finally {
      setAddBusy(false)
    }
  }

  function openEdit() {
    if (!item) return
    setEditDescription(item.description)
    setEditTags(item.tags.split(',').map((t) => t.trim()).filter(Boolean))
    setEditError('')
    setEditOpen(true)
  }

  async function onSaveEdit(e: FormEvent) {
    e.preventDefault()
    if (!item || busy) return
    setBusy(true)
    setEditError('')
    try {
      await api.updateLocation(item.id, {
        description: editDescription.trim(),
        tags: editTags.join(', '),
      }, accountId)
      setEditOpen(false)
      const updated = await api.location(item.id, accountId)
      setItem(updated)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to save location')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Dashboard', to: `${base}` },
          { label: 'Locations', to: `${base}/locations` },
          { label: item ? item.location : '…' },
        ]}
      />
      {error && <div className="alert">{error}</div>}
      {item && (
        <>
          <div className="page-head">
            <div>
              <h1>{item.location}</h1>
              <p className="page-subtitle no-margin location-subtitle">
                {item.type && <span className="tag">{typeLabel(item.type)}</span>}
                {subtitleFor(item) && <span className="muted subtitle-location">{subtitleFor(item)}</span>}
              </p>
            </div>
            <div className="page-head-actions">
              <button type="button" className="btn" onClick={openEdit}>
                Edit
              </button>
              <button type="button" className="button" onClick={openAdd}>
                Add Service
              </button>
            </div>
          </div>

          <div className="panel">
            <div className="place-info detail-extra">
              <div className="place-info-row icon-row location-row">
                <span
                  className="location-field"
                  ref={fieldRef}
                  onClick={() => (tipOpen ? closeTip() : openTip())}
                  onMouseEnter={openTip}
                  onMouseLeave={closeTip}
                >
                  <span className="muted" title="Full location">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </span>
                  <strong>{item.full_location || '—'}</strong>
                  {tipOpen && tipStyle && (
                    <div className="location-tip" style={{ top: tipStyle.top, left: tipStyle.left }}>
                      <div className="place-info-grid">
                        {item.country && (
                          <span className="place-info-cell">
                            <span className="muted">Country</span>
                            {item.country}
                          </span>
                        )}
                        {item.city && (
                          <span className="place-info-cell">
                            <span className="muted">City</span>
                            {item.city}
                          </span>
                        )}
                        {item.county && (
                          <span className="place-info-cell">
                            <span className="muted">County</span>
                            {item.county}
                          </span>
                        )}
                        {item.state && (
                          <span className="place-info-cell">
                            <span className="muted">State</span>
                            {item.state}
                            {item.short_state && ` (${item.short_state})`}
                          </span>
                        )}
                        {item.postal_code && (
                          <span className="place-info-cell">
                            <span className="muted">ZIP</span>
                            {item.postal_code}
                          </span>
                        )}
                        {item.latitude != null && item.longitude != null && (
                          <span className="place-info-cell">
                            <span className="muted">Coordinates</span>
                            {item.latitude}, {item.longitude}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </span>
                <span className="location-modified" title="Last modified" onClick={() => setDatesOpen(true)}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {new Date(item.updated_at || item.created_at).toLocaleString()}
                </span>
              </div>
              {item.latitude != null && item.longitude != null && (
                <div className="location-meta">
                  <a
                    className="maps-link"
                    href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View on Google Maps
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginLeft: 4 }}>
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <path d="M15 3h6v6" />
                      <path d="M10 14 21 3" />
                    </svg>
                  </a>
                </div>
              )}
            </div>
            <div className="place-info detail-extra">
              <div className="description-box">
                {item.description || <span className="description-placeholder">No description</span>}
              </div>
              <div className="place-info-row tags-row">
                <span className="muted">Tags:</span>
                <strong>
                  {item.tags
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean)
                    .map((t) => (
                      <span key={t} className="tag">
                        {t}
                      </span>
                    ))}
                  {!item.tags.trim() && '—'}
                </strong>
              </div>
            </div>
          </div>

          <div className="panel">
            <h2>Services</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Service</th>
                </tr>
              </thead>
              <tbody>
                {item.service_links.map((l) => (
                  <tr key={l.service_id}>
                    <td>
                      <strong>{l.service_name}</strong>
                    </td>
                  </tr>
                ))}
                {item.service_links.length === 0 && (
                  <tr>
                    <td className="empty">
                      No services yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {addOpen && (
        <div className="modal-overlay">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Services</h3>
            {addError && <div className="alert">{addError}</div>}
            <table className="table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Price</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {services.map((s) => {
                  const linked = item?.service_links.some((l) => l.service_id === s.id)
                  return (
                    <tr key={s.id}>
                      <td>
                        <strong>{s.name}</strong>
                      </td>
                      <td>
                        {Number(s.price).toLocaleString('en-US', {
                          style: 'currency',
                          currency: s.currency,
                        })}
                      </td>
                      <td>
                        {linked ? (
                          <span className="tag">Added</span>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-sm"
                            disabled={addBusy}
                            onClick={() => addService(s)}
                          >
                            Add
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {services.length === 0 && (
                  <tr>
                    <td colSpan={3} className="empty">
                      No services yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setAddOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {datesOpen && item && (
        <div className="modal-overlay">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Dates</h3>
            <p className="page-subtitle no-margin location-subtitle">
              <span className="muted subtitle-location">{item.full_location || item.location}</span>
              {item.type && <span className="tag">{typeLabel(item.type)}</span>}
            </p>
            <div className="place-info-grid">
              <span className="place-info-cell">
                <span className="muted">Created</span>
                {new Date(item.created_at).toLocaleString()}
              </span>
              <span className="place-info-cell">
                <span className="muted">Modified</span>
                {new Date(item.updated_at).toLocaleString()}
              </span>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setDatesOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {editOpen && item && (
        <div className="modal-overlay">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Edit location</h3>
            <p className="page-subtitle no-margin location-subtitle">
              <span className="muted subtitle-location">{item.full_location || item.location}</span>
              {item.type && <span className="tag">{typeLabel(item.type)}</span>}
            </p>
            <form className="modal-form" onSubmit={onSaveEdit}>
              <label className="field-label">
                Description
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="What is this location for?"
                />
              </label>
              <label className="field-label">
                Tags
                <TagInput value={editTags} onChange={setEditTags} />
              </label>
              {editError && <div className="alert">{editError}</div>}
              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setEditOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn primary" disabled={busy}>
                  {busy ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}