import { FormEvent, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api, setToken } from '../api'
import PasswordInput, { passwordStrength } from '../components/PasswordInput'
import PasswordField from '../components/PasswordField'
import SpinnerButton from '../components/SpinnerButton'

export default function Security() {
  const navigate = useNavigate()
  const { email: stateEmail } = (useLocation().state as { email?: string } | null) ?? {}
  const [email] = useState(() => stateEmail || localStorage.getItem('wf_registration_email') || '')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [username, setUsername] = useState(
    () => localStorage.getItem('wf_registration_username') || '',
  )
  const [passwordEnabled, setPasswordEnabled] = useState(false)
  const [twoFactor, setTwoFactor] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!email) navigate('/register', { replace: true })
  }, [email, navigate])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    const trimmedUsername = username.trim()
    if (trimmedUsername && trimmedUsername.length < 3) {
      setError('Login must be at least 3 characters')
      return
    }
    if (password || confirm) {
      if (password !== confirm) {
        setError('Passwords do not match')
        return
      }
      if (passwordStrength(password) !== 4) {
        setError('Password must contain 8+ characters with upper/lower case, numbers and symbols')
        return
      }
    }
    setLoading(true)
    try {
      const data = await api.completeRegistration({ email: email!, username, password, two_factor: twoFactor })
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
        <p className="sec-note">
          You can leave the fields blank and fill them in later in your account settings. In that
          case, you will sign in using a code sent to the email you provided during registration.
        </p>
        <p className="sec-note sec-note--danger">
          * For better security, it is recommended to set a password and enable two-factor
          authentication.
        </p>
        <label>
          Login
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={email ? email.split('@')[0] : 'Your login'}
            autoComplete="username"
            autoFocus
          />
          <span className="field-hint">
            Set a login you can use to sign in, or leave it as is.
          </span>
        </label>
        <label className="checkbox-label auth-checkbox">
          <input
            type="checkbox"
            checked={passwordEnabled}
            onChange={(e) => setPasswordEnabled(e.target.checked)}
          />
          Set password
        </label>
        {passwordEnabled && (
          <>
            <label>
              Password
              <PasswordInput
                value={password}
                onChange={setPassword}
                className={
                  password.length === 0
                    ? undefined
                    : passwordStrength(password) === 4
                      ? 'match-ok'
                      : 'match-bad'
                }
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
                disabled={!password || !confirm || password !== confirm}
                onChange={(e) => setTwoFactor(e.target.checked)}
              />
              Enable two-factor authentication
            </label>
            <span className="field-hint checkbox-hint">
              A password is required to set up two-factor authentication.
            </span>
          </>
        )}
        {error && <div className="alert">{error}</div>}
        <SpinnerButton type="submit" loading={loading}>
          {loading ? 'Saving…' : 'Finish setup'}
        </SpinnerButton>
        <p className="hint">
          <Link to="/login">Skip for now</Link>
        </p>
      </form>
    </div>
  )
}