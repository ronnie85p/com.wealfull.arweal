import { useEffect, useState } from 'react'
import { api, Payment } from '../api'

const amt = (p: Payment) =>
  Number(p.amount).toLocaleString('en-US', { style: 'currency', currency: p.currency })

export default function Payments() {
  const [items, setItems] = useState<Payment[]>([])
  const [filter, setFilter] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .payments()
      .then(setItems)
      .catch((e) => setError(e.message))
  }, [])

  const filtered = filter ? items.filter((p) => p.status === filter) : items

  return (
    <>
      <h1>Payments</h1>
      <p className="page-subtitle">Payment transactions processed for you.</p>

      <div className="filters">
        {['', 'created', 'authorized', 'captured', 'refunded', 'failed'].map((s) => (
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
              <th>Ref</th>
              <th>Invoice</th>
              <th>Method</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id}>
                <td>
                  <code>{p.external_ref}</code>
                </td>
                <td>{p.invoice ? `#${p.invoice}` : '—'}</td>
                <td>{p.method_display}</td>
                <td>{amt(p)}</td>
                <td>
                  <span className={`badge badge-${p.status}`}>{p.status_display}</span>
                </td>
                <td>{new Date(p.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">
                  No payments.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}