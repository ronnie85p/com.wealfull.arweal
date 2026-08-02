import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, Order, User } from '../api'
import Breadcrumbs from '../components/Breadcrumbs'

const currency = (o: Order) =>
  Number(o.amount).toLocaleString('en-US', { style: 'currency', currency: o.currency })

export default function CustomerDetail() {
  const { id } = useParams()
  const customerId = Number(id)

  const [user, setUser] = useState<User | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!customerId) {
      setError('Customer not found.')
      return
    }
    api
      .user(customerId)
      .then(setUser)
      .catch((e) => setError(e.message))
    api
      .userOrders(customerId)
      .then(setOrders)
      .catch((e) => setError(e.message))
  }, [customerId])

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Dashboard', to: '/app' },
          { label: 'Customers', to: '/app/customers' },
          { label: user ? `${user.first_name || user.username} ${user.last_name}`.trim() : '…' },
        ]}
      />
      {error && <div className="alert">{error}</div>}
      {user && (
        <div className="page-head">
          <div>
            <h1>
              {user.first_name} {user.last_name}
            </h1>
            <p className="page-subtitle no-margin">
              @{user.username} · {user.email || 'no email'}
            </p>
            <Link to={`/app/customers/${user.id}/edit`} className="user-edit-link">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              </svg>
              Edit
            </Link>
          </div>
          <div className="actions-cell">
            <Link to={`/app/customers/${user.id}/addresses`} className="btn-secondary">
              Addresses
            </Link>
            <Link to="/app/orders/new" className="button">
              + Create order
            </Link>
          </div>
        </div>
      )}

      <div className="panel">
        <h2>Orders</h2>
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>External ID</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{o.id}</td>
                <td>{o.external_id}</td>
                <td>{o.description}</td>
                <td>{currency(o)}</td>
                <td>
                  <span className={`badge badge-${o.status}`}>{o.status}</span>
                </td>
                <td>{new Date(o.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">
                  No orders for this customer yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}