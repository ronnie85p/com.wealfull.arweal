import { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import { api } from '../api'
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
  const [auth, setAuth] = useState<{ user: User | null; authenticated: boolean }>({
    user: initial?.user ?? null,
    authenticated: initial?.authenticated ?? false,
  })
  const [error, setError] = useState(false)

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined
    interval = setInterval(() => {
      api
        .authStatus()
        .then((s) => setAuth({ user: s.user, authenticated: s.authenticated }))
        .catch(() => {
          setError(true)
          if (interval) clearInterval(interval)
        })
    }, 5000)
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ ...auth, loading: false, error }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}