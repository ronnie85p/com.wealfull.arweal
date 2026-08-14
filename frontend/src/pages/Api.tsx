import { FormEvent, useEffect, useState } from 'react'
import { api, ApiKey } from '../api'

export default function ApiPage() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState<ApiKey | null>(null)
  const [delBusy, setDelBusy] = useState(false)

  function load() {
    api.apiKeys().then(setKeys).catch((e) => setError(e.message))
  }

  useEffect(load, [])

  function openModal() {
    setName('')
    setDescription('')
    setError('')
    setModalOpen(true)
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      await api.createApiKey(name.trim(), description.trim())
      setModalOpen(false)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create key')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!deleting || delBusy) return
    setDelBusy(true)
    setError('')
    try {
      await api.deleteApiKey(deleting.id)
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
      <h1>Api Keys</h1>
      <p className="subtitle">Manage the API keys your system uses to integrate with Wealfull.</p>

      <div className="page-head-actions">
        <button className="btn primary" onClick={openModal}>
          Create key
        </button>
      </div>
      {error && <div className="alert">{error}</div>}

      <div className="panel">
        <h2>API keys</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Key</th>
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
                  <code>{k.key}</code>
                </td>
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
                <td colSpan={5} className="empty">
                  No API keys yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Create API key</h3>
            <form className="modal-form" onSubmit={onCreate}>
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
                <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
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
            <h3>Delete API key</h3>
            <p className="modal-subtitle">
              Are you sure you want to delete <strong>{deleting.name}</strong>? Any integration
              using this key will stop working.
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