import { FormEvent, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, ApiKey } from '../api'
import Breadcrumbs from '../components/Breadcrumbs'
import { useAccountContext } from '../components/AccountContext'
import { useAccountBase } from '../lib/account'

const PERMISSION_GROUPS: { label: string; read: string; write: string }[] = [
  { label: 'Orders', read: 'orders.read', write: 'orders.write' },
  { label: 'Services', read: 'services.read', write: 'services.write' },
  { label: 'Projects', read: 'projects.read', write: 'projects.write' },
  { label: 'Categories', read: 'categories.read', write: 'categories.write' },
  { label: 'Locations', read: 'locations.read', write: 'locations.write' },
  { label: 'Customers', read: 'customers.read', write: 'customers.write' },
  { label: 'Companies', read: 'companies.read', write: 'companies.write' },
  { label: 'Materials', read: 'materials.read', write: 'materials.write' },
  { label: 'Invoices', read: 'invoices.read', write: 'invoices.write' },
  { label: 'Payments', read: 'payments.read', write: 'payments.write' },
]

function maskKey(key: string) {
  if (key.length <= 8) return key
  return key.slice(0, 8) + '•'.repeat(key.length - 8)
}

export default function ApiKeyDetail() {
  const { id } = useParams()
  const keyId = Number(id)
  const base = useAccountBase()
  const { account } = useAccountContext()
  const accountId = account?.uuid ?? ''

  const [item, setItem] = useState<ApiKey | null>(null)
  const [permissions, setPermissions] = useState<string[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!keyId) {
      setError('API key not found.')
      return
    }
    if (!accountId) return
    api
      .apiKey(keyId, accountId)
      .then((k) => {
        setItem(k)
        setName(k.name)
        setDescription(k.description)
        setPermissions(k.permissions)
      })
      .catch((e) => setError(e.message))
  }, [keyId, accountId])

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

  function toggle(perm: string) {
    setSaved(false)
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    )
  }

  async function onSave(e: FormEvent) {
    e.preventDefault()
    if (!item || busy) return
    setBusy(true)
    setError('')
    setSaved(false)
    try {
      const updated = await api.updateApiKey(
        item.id,
        { name: name.trim(), description: description.trim(), permissions },
        accountId,
      )
      setItem(updated)
      setPermissions(updated.permissions)
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Dashboard', to: `${base}` },
          { label: 'Api', to: `${base}/api` },
          { label: item ? item.name : '…' },
        ]}
      />

      <div className="page-head">
        <div>
          <h1>API key</h1>
          <p className="page-subtitle no-margin">Manage the permissions this key grants.</p>
        </div>
        <Link to={`${base}/api`} className="button">
          Back to Api
        </Link>
      </div>

      {error && <div className="alert">{error}</div>}
      {saved && <div className="alert alert-success">Saved.</div>}
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

      {!item && !error && <p className="muted">Loading…</p>}

      {item && (
        <form onSubmit={onSave}>
          <div className="panel">
            <h2>Details</h2>
            <div className="form-grid">
              <label className="field-label">
                Name *
                <input value={name} onChange={(e) => setName(e.target.value)} required />
              </label>
              <label className="field-label">
                Key
                <span className="key-cell">
                  <code className="clickable" onClick={() => copyKey(item.key)} title="Copy">
                    {maskKey(item.key)}
                  </code>
                  <button className="icon-btn" type="button" tabIndex={-1} aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                </span>
              </label>
              <label className="field-label">
                Created
                <span className="field-value">{new Date(item.created_at).toLocaleDateString()}</span>
              </label>
              <label className="field-label">
                Last used
                <span className="field-value">
                  {item.last_used_at ? new Date(item.last_used_at).toLocaleDateString() : 'Never'}
                </span>
              </label>
              <label className="field-label">
                Description
                <textarea
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value)
                    setSaved(false)
                  }}
                  rows={3}
                />
              </label>
            </div>
          </div>

          <div className="panel">
            <h2>Permissions</h2>
            <p className="page-subtitle">Choose what this key is allowed to do.</p>
            <table className="table">
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Read</th>
                  <th>Write</th>
                </tr>
              </thead>
              <tbody>
                {PERMISSION_GROUPS.map((g) => (
                  <tr key={g.read}>
                    <td>{g.label}</td>
                    <td>
                      <input
                        type="checkbox"
                        checked={permissions.includes(g.read)}
                        onChange={() => toggle(g.read)}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={permissions.includes(g.write)}
                        onChange={() => toggle(g.write)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="modal-actions">
            <button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </button>
            <Link to={`${base}/api`} className="btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      )}
    </>
  )
}