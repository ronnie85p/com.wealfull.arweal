import { FormEvent, useEffect, useState } from 'react'
import { api, ApiKey } from '../api'

export default function ApiPage() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  function load() {
    api.apiKeys().then(setKeys).catch((e) => setError(e.message))
  }

  useEffect(load, [])

  async function onNew(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setError('')
    try {
      await api.createApiKey(name.trim())
      setName('')
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create key')
    }
  }

  async function toggle(k: ApiKey) {
    try {
      await api.toggleApiKey(k.id, !k.active)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    }
  }

  async function remove(k: ApiKey) {
    if (!confirm(`Delete API key "${k.name}"?`)) return
    try {
      await api.deleteApiKey(k.id)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    }
  }

  return (
    <>
      <h1>Api</h1>
      <p className="subtitle">Manage the API keys your system uses to integrate with Wealfull.</p>

      <form className="inline-form" onSubmit={onNew}>
        <input
          placeholder="Key name, e.g. Production"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit">Create key</button>
      </form>
      {error && <div className="alert">{error}</div>}

      <div className="panel">
        <h2>API keys</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Key</th>
              <th>Created</th>
              <th>Last used</th>
              <th>Active</th>
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
                <td>{new Date(k.created_at).toLocaleDateString()}</td>
                <td>{k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : '—'}</td>
                <td>
                  <button className={`badge badge-${k.active ? 'paid' : 'pending'}`} onClick={() => toggle(k)}>
                    {k.active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td>
                  <button className="btn-danger" onClick={() => remove(k)} title="Delete">
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
    </>
  )
}