import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import EmailInput from '../components/EmailInput'

export default function Register() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [accountType, setAccountType] = useState('Company')
  const [joinTo, setJoinTo] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [ein, setEin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim() || !fullName.trim()) {
      setError('Name and email are required.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const nameParts = fullName.trim().split(/\s+/)
      const firstname = nameParts[0] ?? ''
      const midname = nameParts.length === 3 ? nameParts[1] : ''
      const lastname = nameParts.length === 3 ? nameParts[2] : nameParts.slice(1).join(' ')
      const username = email.split('@')[0] || email
      const data = await api.register({
        username,
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
          <select value={accountType} onChange={(e) => setAccountType(e.target.value)}>
            <option value="Company">Company</option>
            <option value="Employer">Employer</option>
          </select>
        </label>
        {accountType === 'Company' && (
          <>
            <label>
              Company Name
              <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </label>
            <label>
              EIN
              <input value={ein} onChange={(e) => setEin(e.target.value)} />
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
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus />
        </label>
        <label>
          Email
          <EmailInput value={email} onChange={setEmail} />
        </label>
        {error && <div className="alert">{error}</div>}
        <button type="submit" disabled={loading}>
          {loading ? 'Creating account…' : 'Continue'}
        </button>
        <p className="hint">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  )
}