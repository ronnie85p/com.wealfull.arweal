import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { setToken } from '../api'
import { useAuth } from './AuthContext'
import CompanyHeader from './CompanyHeader'
import { useAccountContext } from './AccountContext'
import { useAccountBase } from '../lib/account'

function menu(base: string) {
  return [
    { to: `${base}`, label: 'Dashboard', end: true },
    { to: `${base}/orders`, label: 'Orders', end: false },
    { to: `${base}/services`, label: 'Services', end: false },
    { to: `${base}/materials`, label: 'Materials', end: false },
    { to: `${base}/projects`, label: 'Projects', end: false },
    { to: `${base}/employers`, label: 'Employers', end: false },
    { to: `${base}/customers`, label: 'Customers', end: false },
    { to: `${base}/invoices`, label: 'Invoices', end: false },
    { to: `${base}/payments`, label: 'Payments', end: false },
  ]
}

const apiItem = (base: string) => ({ to: `${base}/api`, label: 'Api', end: false })

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
  const { user: ctxUser } = useAuth()
  const { account, accountLoading } = useAccountContext()
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const user = account?.user ?? ctxUser

  const userName = user?.username ?? 'Account'
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || userName
  const accountTypeName = account?.account_type?.name ?? user?.account_type ?? ''
  const base = useAccountBase()
  const items = menu(base)
  const apiLink = apiItem(base)

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

  if (accountLoading) {
    return (
      <div className="page-spinner">
        <span className="btn-spinner" />
      </div>
    )
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
              <span className="profile-name">
                <span>{fullName}</span>
                {accountTypeName && <small>{accountTypeName}</small>}
              </span>
              <span className={`status-dot ${user?.online ? 'online' : 'offline'}`} />
              <span className="company-caret">▾</span>
            </button>
            {profileOpen && (
              <div className="profile-dropdown">
                <div className="profile-head">
                  <strong>{fullName}</strong>
                  {accountTypeName && <em className="profile-account-type">{accountTypeName}</em>}
                </div>
                <div className="dropdown-divider" />
                <button
                  type="button"
                  className="profile-option profile-option--neutral"
                  onClick={() => {
                    setProfileOpen(false)
                    navigate(`${base}/settings`)
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
            {items.map((item) => (
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
              to={apiLink.to}
              end={apiLink.end}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
{apiLink.label}
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