import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, Material } from '../api'
import { useAccountBase } from '../lib/account'

export default function Materials() {
  const [items, setItems] = useState<Material[]>([])
  const base = useAccountBase()
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .materials()
      .then(setItems)
      .catch((e) => setError(e.message))
  }, [])

  async function remove(m: Material) {
    if (!window.confirm(`Delete material "${m.name}"?`)) return
    try {
      await api.deleteMaterial(m.id)
      setItems((prev) => prev.filter((x) => x.id !== m.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete material')
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Materials</h1>
          <p className="page-subtitle no-margin">Your materials catalog.</p>
        </div>
        <Link to={`${base}/materials/new`} className="button">
          + Create material
        </Link>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Created</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((m) => (
              <tr key={m.id}>
                <td>{m.id}</td>
                <td>
                  <strong>{m.name}</strong>
                </td>
                <td>{new Date(m.created_at).toLocaleDateString()}</td>
                <td>
                  <div className="row-actions">
                    <Link to={`${base}/materials/${m.id}/edit`} className="btn-secondary btn-sm">
                      Edit
                    </Link>
                    <button type="button" className="btn-danger btn-sm" onClick={() => remove(m)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="empty">
                  No materials.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}