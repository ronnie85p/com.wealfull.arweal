import { useEffect, useState } from 'react'
import { api, Invoice } from '../api'

const money = (inv: Invoice) =>
  Number(inv.amount).toLocaleString('en-US', { style: 'currency', currency: inv.currency })

export default function Invoices() {
  const [items, setItems] = useState<Invoice[]>([])
  const [filter, setFilter] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .invoices()
      .then(setItems)
      .catch((e) => setError(e.message))
  }, [])

  const filtered = filter ? items.filter((i) => i.status === filter) : items

  return (
    <>
      <h1>Invoices</h1>
      <p className="page-subtitle">Invoices issued to you.</p>

      <div className="filters">
        {['', 'issued', 'paid', 'overdue', 'voided'].map((s) => (
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
              <th>Number</th>
              <th>Order</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Due date</th>
              <th>Issued</th>
              <th>Paid at</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr key={i.id}>
                <td>
                  <strong>{i.number}</strong>
                </td>
                <td>{i.order ? `#${i.order}` : '—'}</td>
                <td>{money(i)}</td>
                <td>
                  <span className={`badge badge-${i.status}`}>{i.status_display}</span>
                </td>
                <td>{i.due_date ?? '—'}</td>
                <td>{new Date(i.issued_at).toLocaleDateString()}</td>
                <td>{i.paid_at ? new Date(i.paid_at).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="empty">
                  No invoices.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}