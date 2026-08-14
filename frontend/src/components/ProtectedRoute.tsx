import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getToken } from '../api/client'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation()
  const token = getToken()

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <>{children}</>
}

export function PublicRoute({ children }: { children: ReactNode }) {
  const token = getToken()

  if (token) {
    return <Navigate to="/app" replace />
  }
  return <>{children}</>
}