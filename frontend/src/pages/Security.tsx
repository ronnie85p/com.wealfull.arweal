import { FormEvent, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api, setToken } from '../api'
import PasswordInput from '../components/PasswordInput'
import PasswordField from '../components/PasswordField'

export default function Security() {
  const navigate = useNavigate()
  const { email } = (useLocation().state as { email?: string } | null) ?? {}
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [twoFactor, setTwoFactor] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!email) navigate('/register', { replace: true })
  }, [email, navigate])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    try {
      const data = await api.completeRegistration({ email: email!, password, two_factor: twoFactor })
      setToken(data.token)
      navigate('/app', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save security settings')
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
          <p>Secure your account</p>
        </div>
        <label>
          Password
          <PasswordInput
            value={password}
            onChange={setPassword}
            className={confirm.length > 0 && password === confirm ? 'match-ok' : undefined}
          />
        </label>
        <label>
          Confirm password
          <PasswordField
            value={confirm}
            onChange={setConfirm}
            className={
              confirm.length === 0
                ? undefined
                : password === confirm
                  ? 'match-ok'
                  : 'match-bad'
            }
          />
        </label>
        <label className="checkbox-label auth-checkbox">
          <input
            type="checkbox"
            checked={twoFactor}
            onChange={(e) => setTwoFactor(e.target.checked)}
          />
          Enable two-factor authentication
        </label>
        {error && <div className="alert">{error}</div>}
        <button type="submit" disabled={loading}>
          {loading ? 'Saving…' : 'Finish setup'}
        </button>
        <p className="hint">
          <Link to="/login">Skip for now</Link>
        </p>
      </form>
    </div>
  )
}