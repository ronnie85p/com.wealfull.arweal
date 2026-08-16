import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, Order } from '../api'
import { useAccountContext } from '../components/AccountContext'
import { useAccountBase } from '../lib/account'

const currency = (o: Order) =>
  Number(o.amount).toLocaleString('en-US', { style: 'currency', currency: o.currency })

const addressLine = (o: Order) => {
  const a = o.address
  if (!a) return '—'
  const parts = [a.building ? `${a.street} ${a.building}` : a.street, a.unit ? `unit ${a.unit}` : ''].filter(Boolean)
  const meta = [a.city, a.state, a.zip].filter(Boolean).join(', ')
  return [parts.join(', '), meta].filter(Boolean).join(' · ')
}

const projectsLine = (o: Order) => (o.project ? `#${o.project}` : '—')

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([])
  const base = useAccountBase()
  const { account } = useAccountContext()
  const [filter, setFilter] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!account?.uuid) return
    api
      .orders(account.uuid)
      .then(setOrders)
      .catch((e) => setError(e.message))
  }, [account?.uuid])

  const filtered = filter ? orders.filter((o) => o.status === filter) : orders

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Orders</h1>
          <p className="page-subtitle no-margin">All orders created by your integration.</p>
        </div>
        <Link to={`${base}/orders/new`} className="button">
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
              <th>Address</th>
              <th>Projects</th>
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
                <td>{addressLine(o)}</td>
                <td>{projectsLine(o)}</td>
                <td>{currency(o)}</td>
                <td>
                  <span className={`badge badge-${o.status}`}>{o.status}</span>
                </td>
                <td>{new Date(o.created_at).toLocaleString()}</td>
                <td>
                  <Link to={`${base}/orders/${o.id}/edit`} className="btn-secondary btn-sm">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="empty">
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