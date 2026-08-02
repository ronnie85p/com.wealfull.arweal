import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, Order } from '../api'

const currency = (o: Order) =>
  Number(o.amount).toLocaleString('en-US', { style: 'currency', currency: o.currency })

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .orders()
      .then(setOrders)
      .catch((e) => setError(e.message))
  }, [])

  const filtered = filter ? orders.filter((o) => o.status === filter) : orders

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Orders</h1>
          <p className="page-subtitle no-margin">All orders created by your integration.</p>
        </div>
        <Link to="/app/orders/new" className="button">
          + Create order
        </Link>
      </div>

      <div className="filters">
        {['', 'pending', 'paid', 'canceled'].map((s) => (
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
              <th>External ID</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Created</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id}>
                <td>{o.id}</td>
                <td>{o.external_id}</td>
                <td>{o.description}</td>
                <td>{currency(o)}</td>
                <td>
                  <span className={`badge badge-${o.status}`}>{o.status}</span>
                </td>
                <td>{new Date(o.created_at).toLocaleString()}</td>
                <td>
                  <Link to={`/app/orders/${o.id}/edit`} className="btn-secondary btn-sm">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="empty">
                  No orders.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}