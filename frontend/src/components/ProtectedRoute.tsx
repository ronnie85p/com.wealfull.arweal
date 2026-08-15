import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getToken } from '../api/client'
import { useAuth } from './AuthContext'
import { accountBase } from '../lib/account'

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
  const { user } = useAuth()

  if (token) {
    return <Navigate to={accountBase(user?.id)} replace />
  }
  return <>{children}</>
}