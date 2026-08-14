import { useLocation } from 'react-router-dom'

const AUTH_PATHS = new Set(['/login', '/register', '/confirm', '/password', '/security', '/403'])
const EDIT_RE = /\/new$|\/new\/$|\/edit$|\/edit\/$|\/addresses\/new$|\/companies\/new$/

function SkeletonBlock({ children }: { children: React.ReactNode }) {
  return <div className="skeleton-block">{children}</div>
}

function SkeletonLine({ className = '' }: { className?: string }) {
  return <div className={`skeleton-line ${className}`} />
}

function RegisterSkeleton() {
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="skeleton-logo" />
          <div className="skeleton-title" />
          <div className="skeleton-subtitle" />
        </div>
        <div className="skeleton-field">
          <div className="skeleton-label" />
          <div className="skeleton-control" />
        </div>
        <div className="skeleton-field">
          <div className="skeleton-label" />
          <div className="skeleton-control" />
        </div>
        <div className="skeleton-field">
          <div className="skeleton-label" />
          <div className="skeleton-control" />
        </div>
        <div className="skeleton-field">
          <div className="skeleton-label" />
          <div className="skeleton-control" />
        </div>
        <div className="skeleton-field">
          <div className="skeleton-label" />
          <div className="skeleton-control" />
        </div>
        <div className="skeleton-control skeleton-control--button" />
        <div className="skeleton-hint" />
      </div>
    </div>
  )
}

function LoginSkeleton() {
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="skeleton-logo" />
          <div className="skeleton-title" />
          <div className="skeleton-subtitle" />
        </div>
        <div className="skeleton-field">
          <div className="skeleton-label" />
          <div className="skeleton-control" />
        </div>
        <div className="skeleton-control skeleton-control--button" />
        <div className="skeleton-hint" />
      </div>
    </div>
  )
}

function AuthSkeleton() {
  return (
    <div className="skeleton-auth">
      <SkeletonBlock>
        <div className="auth-brand">
          <div className="skeleton-logo" />
        </div>
        <SkeletonLine className="skeleton-title" />
        <SkeletonLine className="skeleton-subtitle" />
        <div className="skeleton-auth-field">
          <SkeletonLine className="skeleton-label" />
          <SkeletonLine className="skeleton-input" />
        </div>
        <div className="skeleton-auth-field">
          <SkeletonLine className="skeleton-label" />
          <SkeletonLine className="skeleton-input" />
        </div>
        <div className="skeleton-auth-field">
          <SkeletonLine className="skeleton-label" />
          <SkeletonLine className="skeleton-input" />
        </div>
        <div className="skeleton-auth-field">
          <SkeletonLine className="skeleton-label" />
          <SkeletonLine className="skeleton-input" />
        </div>
        <SkeletonLine className="skeleton-btn skeleton-btn-block" />
        <SkeletonLine className="skeleton-hint" />
      </SkeletonBlock>
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="skeleton-full">
      <div className="skeleton-page">
        <SkeletonBlock>
          <div className="skeleton-head-row">
            <SkeletonLine className="skeleton-title" />
            <SkeletonLine className="skeleton-btn" />
          </div>
          <SkeletonLine className="w70" />
        </SkeletonBlock>
        <SkeletonBlock>
          <div className="skeleton-table-head">
            <SkeletonLine className="w30" />
            <SkeletonLine className="w40" />
            <SkeletonLine className="w30" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div className="skeleton-table-row" key={i}>
              <SkeletonLine className="skeleton-cell" />
              <SkeletonLine className="skeleton-cell" />
              <SkeletonLine className="skeleton-cell" />
            </div>
          ))}
        </SkeletonBlock>
      </div>
    </div>
  )
}

function FormSkeleton() {
  return (
    <div className="skeleton-full">
      <div className="skeleton-page">
        <SkeletonBlock>
          <SkeletonLine className="skeleton-title" />
        </SkeletonBlock>
        <SkeletonBlock>
          <div className="skeleton-form-row">
            <div className="skeleton-auth-field">
              <SkeletonLine className="skeleton-label" />
              <SkeletonLine className="skeleton-input" />
            </div>
            <div className="skeleton-auth-field">
              <SkeletonLine className="skeleton-label" />
              <SkeletonLine className="skeleton-input" />
            </div>
          </div>
          <div className="skeleton-auth-field">
            <SkeletonLine className="skeleton-label" />
            <SkeletonLine className="skeleton-input w70" />
          </div>
          <SkeletonLine className="skeleton-btn" />
        </SkeletonBlock>
      </div>
    </div>
  )
}

function GenericSkeleton() {
  return (
    <div className="skeleton-full">
      <div className="skeleton-page">
        <SkeletonBlock>
          <SkeletonLine className="skeleton-title" />
          <SkeletonLine className="w70" />
        </SkeletonBlock>
        <div className="skeleton-cards">
          <div className="skeleton-block skeleton-card" />
          <div className="skeleton-block skeleton-card" />
          <div className="skeleton-block skeleton-card" />
          <div className="skeleton-block skeleton-card" />
        </div>
        <SkeletonBlock>
          <SkeletonLine />
          <SkeletonLine className="w70" />
          <SkeletonLine className="w40" />
        </SkeletonBlock>
      </div>
    </div>
  )
}

export default function PageSkeleton() {
  const { pathname } = useLocation()

  if (pathname === '/register') return <RegisterSkeleton />
  if (pathname === '/login' || pathname === '/password') return <LoginSkeleton />
  if (AUTH_PATHS.has(pathname)) return <AuthSkeleton />
  if (EDIT_RE.test(pathname)) return <FormSkeleton />
  if (pathname.startsWith('/app/')) return <TableSkeleton />
  if (pathname === '/app') return <GenericSkeleton />
  return <GenericSkeleton />
}