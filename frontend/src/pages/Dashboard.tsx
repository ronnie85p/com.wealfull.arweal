import { useEffect, useState } from 'react'
import { api, Order } from '../api'
import { useAccountContext } from '../components/AccountContext'

export default function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const { account } = useAccountContext()

  useEffect(() => {
    if (!account?.uuid) return
    api.orders(account.uuid).then(setOrders).catch(() => undefined)
  }, [account?.uuid])

  const total = orders.reduce((sum, o) => sum + Number(o.amount), 0)
  const paid = orders.filter((o) => o.status === 'paid').reduce((s, o) => s + Number(o.amount), 0)

  return (
    <>
      <h1>Dashboard</h1>
      <div className="cards">
        <div className="card">
          <span className="card-label">Orders</span>
          <span className="card-value">{orders.length}</span>
        </div>
        <div className="card">
          <span className="card-label">Volume</span>
          <span className="card-value">
            {total.toLocaleString('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
          </span>
        </div>
        <div className="card">
          <span className="card-label">Paid</span>
          <span className="card-value">
            {paid.toLocaleString('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>
      <div className="panel">
        <h2>Recent orders</h2>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>External</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.slice(0, 5).map((o) => (
              <tr key={o.id}>
                <td>#{o.id}</td>
                <td>{o.external_id}</td>
                <td>{o.description}</td>
                <td>
                  {Number(o.amount).toLocaleString('en-US', { style: 'currency', currency: o.currency })}
                </td>
                <td>
                  <span className={`badge badge-${o.status}`}>{o.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}