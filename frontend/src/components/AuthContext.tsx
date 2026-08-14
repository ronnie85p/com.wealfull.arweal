import { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import { api } from '../api'
import { User } from '../api/client'

interface AuthState {
  user: User | null
  authenticated: boolean
}

const AuthContext = createContext<AuthState>({ user: null, authenticated: false })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, authenticated: false })

  useEffect(() => {
    const check = () =>
      api
        .authStatus()
        .then((s) => setState({ user: s.user, authenticated: s.authenticated }))
        .catch(() => undefined)
    check()
    const interval = setInterval(check, 5000)
    return () => clearInterval(interval)
  }, [])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
