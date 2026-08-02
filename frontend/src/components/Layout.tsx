import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { api, setToken } from '../api'

const menu = [
  { to: '/app', label: 'Dashboard', end: true },
  { to: '/app/orders', label: 'Orders', end: false },
  { to: '/app/customers', label: 'Customers', end: false },
  { to: '/app/invoices', label: 'Invoices', end: false },
  { to: '/app/payments', label: 'Payments', end: false },
]

const apiItem = { to: '/app/api', label: 'Api', end: false }

export default function Layout() {
  const navigate = useNavigate()
  const [userName, setUserName] = useState<string | null>(null)

  useEffect(() => {
    api.me().then((u) => setUserName(u.username)).catch(() => undefined)
  }, [])

  function logout() {
    setToken(null)
    navigate('/login', { replace: true })
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">W</span>
          <div>
            <strong>Wealfull</strong>
            <small>CRM</small>
          </div>
        </div>
        <nav className="nav">
          {menu.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              {item.label}
            </NavLink>
          ))}
          <div className="nav-divider" />
          <NavLink
            to={apiItem.to}
            end={apiItem.end}
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            {apiItem.label}
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <a href="#" onClick={logout} className="logout-link">
            Sign out
          </a>
        </div>
      </aside>
      <main className="content">
        <header className="topbar">
          <span className="topbar-title">Personal cabinet</span>
          <Link to="/app" className="topbar-user">
            {userName ?? 'Account'}
          </Link>
        </header>
        <div className="page">
          <Outlet />
        </div>
      </main>
    </div>
  )
}