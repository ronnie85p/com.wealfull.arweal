import { useEffect, useState } from 'react'
import { api, User } from '../api'

export default function Employers() {
  const [items, setItems] = useState<User[]>([])
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
          <h1>Employers</h1>
          <p className="page-subtitle no-margin">Executors available for your orders.</p>
        </div>
      </div>

      <input
        className="search-input"
        placeholder="Search employers by name or email…"
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
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={4} className="empty">
                  No employers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
