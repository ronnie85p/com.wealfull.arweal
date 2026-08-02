import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, User } from '../api'
import Addresses from '../components/Addresses'
import Breadcrumbs from '../components/Breadcrumbs'

export default function CustomerAddresses() {
  const { id } = useParams()
  const customerId = Number(id)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    if (!customerId) return
    api.user(customerId).then(setUser).catch(() => undefined)
  }, [customerId])

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Dashboard', to: '/app' },
          { label: 'Customers', to: '/app/customers' },
          { label: user ? `${user.first_name || user.username} ${user.last_name}`.trim() : '…', to: `/app/customers/${customerId}` },
          { label: 'Addresses' },
        ]}
      />
      <div className="page-head">
        <div>
          <h1>Addresses</h1>
          <p className="page-subtitle no-margin">
            {user ? `Addresses of ${user.first_name || user.username} ${user.last_name}`.trim() : 'Customer addresses'}.
          </p>
        </div>
        <Link to="new" className="button">
          + New address
        </Link>
      </div>

      <Addresses userId={customerId} showHeading={false} />
    </>
  )
}