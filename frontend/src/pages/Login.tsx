import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import SpinnerButton from '../components/SpinnerButton'

export default function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.loginCheck(username)
      if (data.password_set) {
        navigate('/password', { state: { username } })
        return
      }
      const sent = await api.loginSendCode(username)
      localStorage.setItem('wf_code_expires_at', String(new Date(sent.expires_at).getTime()))
      localStorage.setItem('wf_code_resend_at', String(Date.now() + 30_000))
      localStorage.setItem('wf_registration_email', sent.email)
      navigate('/confirm', { state: { email: sent.email, code: sent.code, mode: 'login' } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
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
          <p>Sign in to your personal cabinet</p>
        </div>
        <label>
          Username or email
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
        </label>
        {error && <div className="alert">{error}</div>}
        <SpinnerButton type="submit" loading={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </SpinnerButton>
        <p className="hint">
          No account? <Link to="/register">Create one</Link>
        </p>
      </form>
    </div>
  )
}