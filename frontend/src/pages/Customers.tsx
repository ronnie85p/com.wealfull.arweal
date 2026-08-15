import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, User } from '../api'
import { useAccountBase } from '../lib/account'

export default function Customers() {
  const [items, setItems] = useState<User[]>([])
  const base = useAccountBase()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    const timer = setTimeout(() => {
      api
        .searchUsers(query.trim())
        .then(setItems)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(timer)
  }, [query])

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Customers</h1>
          <p className="page-subtitle no-margin">All customers of your integration.</p>
        </div>
        <Link to={`${base}/customers/new`} className="button">
          + Create customer
        </Link>
      </div>

      <input
        className="search-input"
        placeholder="Search customers by name or email…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {error && <div className="alert">{error}</div>}

      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Username</th>
              <th>Email</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>
                  {u.first_name} {u.last_name}
                </td>
                <td>{u.username}</td>
                <td>{u.email || '—'}</td>
                <td className="actions-cell">
                  <Link to={`${base}/customers/${u.id}`} className="btn-secondary btn-sm">
                    View
                  </Link>
                  <Link to={`${base}/customers/${u.id}/edit`} className="btn-secondary btn-sm">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={5} className="empty">
                  No customers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}