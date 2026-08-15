import { createContext, ReactNode, useContext } from 'react'
import { User } from '../api/client'

interface AuthState {
  user: User | null
  authenticated: boolean
  loading: boolean
  error: boolean
}

interface AuthProviderProps {
  children: ReactNode
  initial?: { user: User | null; authenticated: boolean }
}

const AuthContext = createContext<AuthState>({
  user: null,
  authenticated: false,
  loading: true,
  error: false,
})

export function AuthProvider({ children, initial }: AuthProviderProps) {
  const auth = { user: initial?.user ?? null, authenticated: initial?.authenticated ?? false }
  return (
    <AuthContext.Provider value={{ ...auth, loading: false, error: false }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}