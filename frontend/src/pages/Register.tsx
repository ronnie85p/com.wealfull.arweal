import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AccountType, api } from '../api'
import EinInput, { EIN_LENGTH } from '../components/EinInput'
import EmailInput from '../components/EmailInput'
import PageSkeleton from '../components/PageSkeleton'
import SelectDropdown from '../components/SelectDropdown'
import SpinnerButton from '../components/SpinnerButton'

const FALLBACK_ACCOUNT_TYPES: AccountType[] = [
  { id: 0, name: 'Company', description: '' },
  { id: 0, name: 'Employer', description: '' },
]

export default function Register() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [accountType, setAccountType] = useState('Company')
  const [accountTypes, setAccountTypes] = useState<AccountType[]>([])
  const [joinTo, setJoinTo] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [ein, setEin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [accountTypesLoading, setAccountTypesLoading] = useState(true)

  useEffect(() => {
    api
      .accountTypes()
      .then((types) => {
        if (!types.length) return
        setAccountTypes(types)
        setAccountType((prev) => (types.some((t) => t.name === prev) ? prev : types[0].name))
      })
      .catch(() => {
        setAccountTypes(FALLBACK_ACCOUNT_TYPES)
      })
      .finally(() => {
        setAccountTypesLoading(false)
      })
  }, [])

  if (accountTypesLoading) return <PageSkeleton />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim() || !fullName.trim()) {
      setError('Name and email are required.')
      return
    }
    const einDigits = ein.replace(/\D/g, '')
    if (accountType === 'Company' && einDigits.length > 0 && einDigits.length !== EIN_LENGTH) {
      setError(`EIN must contain ${EIN_LENGTH} digits.`)
      return
    }
    setError('')
    setLoading(true)
    try {
      const nameParts = fullName.trim().split(/\s+/)
      const firstname = nameParts[0] ?? ''
      const midname = nameParts.length === 3 ? nameParts[1] : ''
      const lastname = nameParts.length === 3 ? nameParts[2] : nameParts.slice(1).join(' ')
      const data = await api.register({
        email,
        account_type: accountType,
        firstname,
        midname,
        lastname,
        ...(accountType === 'Company' ? { company_name: companyName, ein } : {}),
      })
      navigate('/confirm', { state: { email, code: data.code } })
      localStorage.setItem('wf_code_expires_at', String(Date.now() + 900_000))
      localStorage.setItem('wf_code_resend_at', String(Date.now() + 30_000))
      localStorage.setItem('wf_registration_email', email)
      localStorage.setItem('wf_registration_username', data.user.username)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={onSubmit}>
        <div className="auth-brand">
          <span className="brand-mark">W</span>
          <h1>Wealfull CRM</h1>
          <p>Create your account</p>
        </div>
        <label>
          Account type
          <SelectDropdown
              value={accountType}
              options={accountTypes.map((t) => ({ label: t.name, value: t.name }))}
              onChange={setAccountType}
            />
        </label>
        {accountType === 'Company' && (
          <>
            <label>
              Company Name
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                autoFocus
              />
            </label>
            <label>
              EIN
              <EinInput value={ein} onChange={setEin} />
            </label>
          </>
        )}
        {accountType === 'Employer' && (
          <label>
            Join to
            <input
              value={joinTo}
              onChange={(e) => setJoinTo(e.target.value)}
              placeholder="Company name or invite code"
            />
          </label>
        )}
        <label>
          Full Name
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </label>
        <label>
          Email
          <EmailInput value={email} onChange={setEmail} />
        </label>
        {error && <div className="alert">{error}</div>}
        <SpinnerButton type="submit" loading={loading}>
          {loading ? 'Creating account…' : 'Continue'}
        </SpinnerButton>
        <p className="hint">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  )
}