import { FormEvent, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api, setToken } from '../api'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('demo')
  const [password, setPassword] = useState('demo12345')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.login(username, password)
      setToken(data.token)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from ?? '/app', { replace: true })
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
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <div className="alert">{error}</div>}
        <button type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="hint">Demo credentials: demo / demo12345</p>
      </form>
    </div>
  )
}