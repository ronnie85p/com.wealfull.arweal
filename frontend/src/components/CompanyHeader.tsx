import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

  return (
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
  )
}