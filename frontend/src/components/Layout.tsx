import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { setToken } from '../api'
import { useAuth } from './AuthContext'
import CompanyHeader from './CompanyHeader'

const menu = [
  { to: '/app', label: 'Dashboard', end: true },
  { to: '/app/orders', label: 'Orders', end: false },
  { to: '/app/services', label: 'Services', end: false },
  { to: '/app/materials', label: 'Materials', end: false },
  { to: '/app/projects', label: 'Projects', end: false },
  { to: '/app/employers', label: 'Employers', end: false },
  { to: '/app/customers', label: 'Customers', end: false },
  { to: '/app/invoices', label: 'Invoices', end: false },
  { to: '/app/payments', label: 'Payments', end: false },
]

const apiItem = { to: '/app/api', label: 'Api Keys', end: false }

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

export default function Layout() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  const userName = user?.username ?? 'Account'
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || userName

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  function logout() {
    setToken(null)
    navigate('/login', { replace: true })
  }

  return (
    <div className="layout">
      <header className="app-header">
        <CompanyHeader />
        <div className="app-header-right">
          <div className="profile-menu" ref={profileRef}>
            <button
              type="button"
              className="profile-trigger"
              onClick={() => setProfileOpen((v) => !v)}
            >
              <span className="profile-avatar">{initials(!user ? 'Account' : fullName)}</span>
              <span>{fullName}</span>
              <span className={`status-dot ${user?.online ? 'online' : 'offline'}`} />
              <span className="company-caret">▾</span>
            </button>
            {profileOpen && (
              <div className="profile-dropdown">
                <div className="profile-head">
                  <strong>{fullName}</strong>
                  <small>{userName}</small>
                </div>
                <div className="dropdown-divider" />
                <button
                  type="button"
                  className="profile-option profile-option--neutral"
                  onClick={() => {
                    setProfileOpen(false)
                    navigate('/app/settings')
                  }}
                >
                  Settings
                </button>
                <button type="button" className="profile-option" onClick={logout}>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <div className="layout-body">
        <aside className="sidebar">
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
      </aside>
        <main className="content">
          <div className="page">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}