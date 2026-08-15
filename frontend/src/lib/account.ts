import { useAuth } from '../components/AuthContext'
import { useAccountContext } from '../components/AccountContext'

export function accountBase(id?: number | null): string {
  return id ? `/account/${id}` : '/account'
}

export function useAccountBase(): string {
  const { user } = useAuth()
  const { account } = useAccountContext()
  const uuid = account?.uuid
  return uuid ? `/account/${uuid}` : accountBase(user?.id)
}
