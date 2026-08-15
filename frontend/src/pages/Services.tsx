import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, Service } from '../api'
import { useAccountBase } from '../lib/account'

const money = (s: Service) =>
  Number(s.amount).toLocaleString('en-US', { style: 'currency', currency: s.currency })

export default function Services() {
  const [items, setItems] = useState<Service[]>([])
  const base = useAccountBase()
  const [filter, setFilter] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .services()
      .then(setItems)
      .catch((e) => setError(e.message))
  }, [])

  const filtered = filter ? items.filter((s) => s.status === filter) : items

  async function remove(s: Service) {
    if (!window.confirm(`Delete service "${s.name}"?`)) return
    try {
      await api.deleteService(s.id)
      setItems((prev) => prev.filter((x) => x.id !== s.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete service')
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Services</h1>
          <p className="page-subtitle no-margin">Your service catalog.</p>
        </div>
        <Link to={`${base}/services/new`} className="button">
          + Create service
        </Link>
      </div>

      <div className="filters">
        {['', 'active', 'inactive'].map((s) => (
          <button
            key={s}
            className={filter === s ? 'filter active' : 'filter'}
            onClick={() => setFilter(s)}
          >
            {s === '' ? 'All' : s}
          </button>
        ))}
      </div>
      {error && <div className="alert">{error}</div>}

      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Created</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id}>
                <td>{s.id}</td>
                <td>
                  <strong>{s.name}</strong>
                </td>
                <td>{s.description}</td>
                <td>{money(s)}</td>
                <td>
                  <span className={`badge badge-${s.status}`}>{s.status_display}</span>
                </td>
                <td>{new Date(s.created_at).toLocaleDateString()}</td>
                <td>
                  <div className="row-actions">
                    <Link to={`${base}/services/${s.id}/edit`} className="btn-secondary btn-sm">
                      Edit
                    </Link>
                    <button type="button" className="btn-danger btn-sm" onClick={() => remove(s)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="empty">
                  No services.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}