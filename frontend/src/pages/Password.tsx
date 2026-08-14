import { FormEvent, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api, setToken } from '../api'
import PasswordInput from '../components/PasswordInput'

export default function Password() {
  const navigate = useNavigate()
  const { username } = (useLocation().state as { username?: string } | null) ?? {}
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!username) navigate('/login', { replace: true })
  }, [username, navigate])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.loginPassword(username!, password)
      setToken(data.token)
      navigate('/app', { replace: true })
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
          <p>Enter your password</p>
        </div>
        <label>
          User
          <input value={username} disabled />
        </label>
        <label>
          Password
          <PasswordInput value={password} onChange={setPassword} autoFocus />
        </label>
        {error && <div className="alert">{error}</div>}
        <button type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="hint">
          <Link to="/login">Back to sign in</Link>
        </p>
      </form>
    </div>
  )
}