import { ReactNode, useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAccountBase } from '../lib/account'

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

const ICON_PATHS: Record<string, ReactNode> = {
  services: (
    <>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </>
  ),
  categories: (
    <>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </>
  ),
  locations: (
    <>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  projects: (
    <>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </>
  ),
  employers: (
    <>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  orders: (
    <>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </>
  ),
  customers: (
    <>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
}

function Icon({ name, size = 16 }: { name: string; size?: number }) {
  return (
    <svg
      className="menu-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICON_PATHS[name] ?? null}
    </svg>
  )
}

export interface HeaderCompany {
  id: number
  name: string
  ein: string
}

export default function CompanyHeader() {
  const navigate = useNavigate()
  const base = useAccountBase()
  const [companies, setCompanies] = useState<HeaderCompany[]>([])
  const [companyId, setCompanyId] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [assetsOpen, setAssetsOpen] = useState(false)
  const assetsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api
      .companies()
      .then((list) => {
        setCompanies(list)
        const saved = localStorage.getItem('wf_company_id')
        if (list.some((c) => String(c.id) === saved)) setCompanyId(saved!)
        else if (list.length > 0) setCompanyId(String(list[0].id))
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
      if (assetsRef.current && !assetsRef.current.contains(e.target as Node)) {
        setAssetsOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const currentCompany = companies.find((c) => String(c.id) === companyId) ?? null

  function selectCompany(id: number) {
    setCompanyId(String(id))
    localStorage.setItem('wf_company_id', String(id))
    setMenuOpen(false)
  }

  const assetsItems = [
    { to: `${base}/services`, label: 'Services', icon: 'services' },
    { to: `${base}/categories`, label: 'Categories', icon: 'categories' },
    { to: `${base}/locations`, label: 'Locations', icon: 'locations' },
    { to: `${base}/projects`, label: 'Projects', icon: 'projects' },
    { to: `${base}/employers`, label: 'Employers', icon: 'employers' },
  ]

  return (
    <div className="company-header">
      <div className="company-menu" ref={menuRef}>
      <button
        type="button"
        className={currentCompany ? 'company-trigger has-company' : 'company-trigger'}
        onClick={() => setMenuOpen((v) => !v)}
      >
        {currentCompany ? (
          <>
            <span className="brand-avatar">{initials(currentCompany.name)}</span>
            <span className="company-titles">
              <strong>{currentCompany.name}</strong>
              <small>{currentCompany.ein ? `EIN ${currentCompany.ein}` : 'Company'}</small>
            </span>
            <span className="company-caret">▾</span>
          </>
        ) : (
          <>
            <span className="brand-mark">W</span>
            <span className="company-titles">
              <strong>Wealfull</strong>
              <small>CRM</small>
            </span>
          </>
        )}
      </button>
      {menuOpen && (
        <div className="company-dropdown">
          {companies.map((c) => (
            <button
              key={c.id}
              type="button"
              className={String(c.id) === companyId ? 'company-option active' : 'company-option'}
              onClick={() => selectCompany(c.id)}
            >
              <span className="company-option-avatar">{initials(c.name)}</span>
              <span>
                <strong>{c.name}</strong>
                <small>{c.ein ? `EIN ${c.ein}` : 'Company'}</small>
              </span>
              {String(c.id) === companyId && <span className="company-check">✓</span>}
            </button>
          ))}
          <div className="dropdown-divider" />
          <button
            type="button"
            className="company-option add"
            onClick={() => {
              setMenuOpen(false)
              navigate(`${base}/companies/new`)
            }}
          >
            + Add company
          </button>
        </div>
      )}
      </div>
      <div className="assets-menu" ref={assetsRef}>
        <button
          type="button"
          className="assets-trigger"
          onClick={() => setAssetsOpen((v) => !v)}
        >
          Assets
          <span className="company-caret">▾</span>
        </button>
        {assetsOpen && (
          <div className="assets-dropdown">
            {assetsItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setAssetsOpen(false)}
                className={({ isActive }) =>
                  isActive ? 'assets-link active' : 'assets-link'
                }
              >
                <Icon name={item.icon} />
                {item.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
      <NavLink
        to={`${base}/orders`}
        className={({ isActive }) => (isActive ? 'assets-trigger active' : 'assets-trigger')}
      >
        <Icon name="orders" />
        Orders
      </NavLink>
      <NavLink
        to={`${base}/customers`}
        className={({ isActive }) => (isActive ? 'assets-trigger active' : 'assets-trigger')}
      >
        <Icon name="customers" />
        Customers
      </NavLink>
    </div>
  )
}