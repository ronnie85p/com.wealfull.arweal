import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api, Account } from '../api/client'

interface AccountContextValue {
  account: Account | null
  accountLoading: boolean
}

export const AccountContext = createContext<AccountContextValue>({
  account: null,
  accountLoading: true,
})

export function AccountProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [account, setAccount] = useState<Account | null>(null)
  const [accountLoading, setAccountLoading] = useState(true)
  const loadedUuidRef = useRef<string | null>(null)

  const match = location.pathname.match(/^\/account\/([^/]+)/)
  const requestedId = match ? match[1] : undefined

  useEffect(() => {
    if (loadedUuidRef.current === requestedId) return
    let cancelled = false
    const apply = (a: Account) => {
      if (cancelled) return
      loadedUuidRef.current = a.uuid
      setAccount(a)
      setAccountLoading(false)
      if (a.uuid !== requestedId) {
        navigate(`/account/${a.uuid}`, { replace: true })
      }
    }
    setAccountLoading(true)
    api
      .account(requestedId)
      .then(apply)
      .catch(() => {
        if (cancelled) return
        if (requestedId) {
          api
            .account()
            .then(apply)
            .catch(() => {
              if (cancelled) return
              setAccountLoading(false)
              setAccount(null)
            })
        } else {
          setAccountLoading(false)
          setAccount(null)
        }
      })
    return () => {
      cancelled = true
    }
  }, [requestedId, navigate])

  return <AccountContext.Provider value={{ account, accountLoading }}>{children}</AccountContext.Provider>
}

export function useAccountContext(): AccountContextValue {
  return useContext(AccountContext)
}
