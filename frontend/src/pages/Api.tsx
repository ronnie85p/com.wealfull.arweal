import { FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiDomain, ApiKey } from '../api'
import { useAccountContext } from '../components/AccountContext'

function maskKey(key: string) {
  if (key.length <= 8) return key
  return key.slice(0, 8) + '•'.repeat(key.length - 8)
}

export default function ApiPage() {
  const { account } = useAccountContext()
  const accountId = account?.uuid ?? null
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [domains, setDomains] = useState<ApiDomain[]>([])
  const [keyModalOpen, setKeyModalOpen] = useState(false)
  const [domainModalOpen, setDomainModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [domain, setDomain] = useState('')
  const [domainName, setDomainName] = useState('')
  const [domainDescription, setDomainDescription] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState<ApiKey | ApiDomain | null>(null)
  const [delBusy, setDelBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  function load() {
    api.apiKeys(accountId).then(setKeys).catch((e) => setError(e.message))
    api.apiDomains(accountId).then(setDomains).catch((e) => setError(e.message))
  }

  useEffect(load, [])

  async function copyKey(key: string) {
    try {
      await navigator.clipboard.writeText(key)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = key
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function openKeyModal() {
    setName('')
    setDomain(domains[0]?.domain ?? '')
    setDescription('')
    setError('')
    setKeyModalOpen(true)
  }

  function openDomainModal() {
    setDomainName('')
    setDomainDescription('')
    setError('')
    setDomainModalOpen(true)
  }

  async function onCreateKey(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      await api.createApiKey(name.trim(), description.trim(), domain.trim(), accountId)
      setKeyModalOpen(false)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create key')
    } finally {
      setBusy(false)
    }
  }

  async function onCreateDomain(e: FormEvent) {
    e.preventDefault()
    if (!domainName.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      await api.createApiDomain(domainName.trim(), domainDescription.trim(), accountId)
      setDomainModalOpen(false)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add domain')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!deleting || delBusy) return
    setDelBusy(true)
    setError('')
    try {
      if ('key' in deleting) {
        await api.deleteApiKey(deleting.id)
      } else {
        await api.deleteApiDomain(deleting.id)
      }
      setDeleting(null)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setDelBusy(false)
    }
  }

  return (
    <>
      <h1>Api</h1>
      <p className="subtitle">Manage the API keys your system uses to integrate with Wealfull.</p>
      <div className="alert alert-info">
        For more details, see the{' '}
        <Link to="/docs?section=api">API documentation</Link>.
      </div>

      <div className="page-head-actions">
        <button className="btn primary" onClick={openKeyModal}>
          Create key
        </button>
        <button className="btn" onClick={openDomainModal}>
          Add domain
        </button>
      </div>
      {error && <div className="alert">{error}</div>}
      {copied && (
        <div className="toast toast-bottom-left">
          <span className="toast-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          API key copied to clipboard
        </div>
      )}

      <div className="panel">
        <h2>API keys</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Key</th>
              <th>Domain</th>
              <th>Description</th>
              <th>Created</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id}>
                <td>{k.name}</td>
                <td>
                  <span className="key-cell">
                    <code className="clickable" onClick={() => copyKey(k.key)} title="Copy">{maskKey(k.key)}</code>
                    <button className="icon-btn" type="button" tabIndex={-1} aria-hidden="true">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    </button>
                  </span>
                </td>
                <td>{k.domain || '—'}</td>
                <td>{k.description || '—'}</td>
                <td>{new Date(k.created_at).toLocaleDateString()}</td>
                <td>
                  <button className="btn-danger" onClick={() => setDeleting(k)} title="Delete">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {keys.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">
                  No API keys yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>Domains</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Domain</th>
              <th>Description</th>
              <th>Created</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {domains.map((d) => (
              <tr key={d.id}>
                <td>
                  <code>{d.domain}</code>
                </td>
                <td>{d.description || '—'}</td>
                <td>{new Date(d.created_at).toLocaleDateString()}</td>
                <td>
                  <button className="btn-danger" onClick={() => setDeleting(d)} title="Delete">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {domains.length === 0 && (
              <tr>
                <td colSpan={4} className="empty">
                  No domains yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {keyModalOpen && (
        <div className="modal-overlay" onClick={() => setKeyModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Create API key</h3>
            <form className="modal-form" onSubmit={onCreateKey}>
              <label className="field-label">
                Domain
                <select value={domain} onChange={(e) => setDomain(e.target.value)}>
                  {domains.length === 0 && <option value="">None</option>}
                  {domains.map((d) => (
                    <option key={d.id} value={d.domain}>
                      {d.domain}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-label">
                Name *
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Production"
                  autoFocus
                  required
                />
              </label>
              <label className="field-label">
                Description
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this key for?"
                  rows={3}
                />
              </label>
              {error && <div className="alert">{error}</div>}
              <div className="modal-actions">
                <button type="submit" disabled={busy || !name.trim()}>
                  {busy ? 'Creating…' : 'Create'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setKeyModalOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {domainModalOpen && (
        <div className="modal-overlay" onClick={() => setDomainModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add domain</h3>
            <form className="modal-form" onSubmit={onCreateDomain}>
              <label className="field-label">
                Domain *
                <input
                  value={domainName}
                  onChange={(e) => setDomainName(e.target.value)}
                  placeholder="e.g. api.example.com"
                  autoFocus
                  required
                />
              </label>
              <label className="field-label">
                Description
                <textarea
                  value={domainDescription}
                  onChange={(e) => setDomainDescription(e.target.value)}
                  placeholder="What is this domain for?"
                  rows={3}
                />
              </label>
              {error && <div className="alert">{error}</div>}
              <div className="modal-actions">
                <button type="submit" disabled={busy || !domainName.trim()}>
                  {busy ? 'Adding…' : 'Add'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setDomainModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {deleting && (
        <div className="modal-overlay" onClick={() => setDeleting(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete {'key' in deleting ? 'API key' : 'domain'}</h3>
            <p className="modal-subtitle">
              Are you sure you want to delete <strong>{'key' in deleting ? deleting.name : deleting.domain}</strong>?
              Any integration using this will stop working.
            </p>
            {error && <div className="alert">{error}</div>}
            <div className="modal-actions">
              <button type="button" className="btn-danger-solid" onClick={remove} disabled={delBusy}>
                {delBusy ? 'Deleting…' : 'Delete'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setDeleting(null)}
                disabled={delBusy}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
