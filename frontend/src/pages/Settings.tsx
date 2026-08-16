import { FormEvent, useEffect, useState } from 'react'
import { api, EmailSettings } from '../api'
import { useAuth } from '../components/AuthContext'
import { useAccountContext } from '../components/AccountContext'
import Breadcrumbs from '../components/Breadcrumbs'
import PasswordField from '../components/PasswordField'
import { useAccountBase } from '../lib/account'

export default function Settings() {
  const { user } = useAuth()
  const base = useAccountBase()
  const { account } = useAccountContext()
  const [tab, setTab] = useState<'account' | 'email'>('account')
  const [form, setForm] = useState({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  const [emailForm, setEmailForm] = useState({
    host: '',
    port: 587,
    username: '',
    password: '',
    use_tls: true,
    from_email: '',
  })
  const [hasPassword, setHasPassword] = useState(false)
  const [emailLoaded, setEmailLoaded] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [emailSuccess, setEmailSuccess] = useState('')
  const [emailSaving, setEmailSaving] = useState(false)
  const [testRecipient, setTestRecipient] = useState('')
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    if (!user) return
    setForm({
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      password: '',
    })
  }, [user])

  useEffect(() => {
    if (!account) return
    api
      .emailSettings(account.uuid)
      .then((s: EmailSettings) => {
        setEmailForm({
          host: s.host,
          port: s.port,
          username: s.username,
          password: '',
          use_tls: s.use_tls,
          from_email: s.from_email,
        })
        setHasPassword(s.password !== '')
        setEmailLoaded(true)
      })
      .catch(() => {
        setEmailError('Failed to load email settings.')
        setEmailLoaded(true)
      })
  }, [account])

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function setEmail<K extends keyof typeof emailForm>(key: K, value: string | number | boolean) {
    setEmailForm((f) => ({ ...f, [key]: value }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      await api.updateUser(user.id, {
        username: form.username.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        password: form.password || undefined,
      })
      setForm((f) => ({ ...f, password: '' }))
      setSuccess('Settings saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  async function onEmailSubmit(e: FormEvent) {
    e.preventDefault()
    if (!account) return
    setEmailError('')
    setEmailSuccess('')
    setEmailSaving(true)
    try {
      const payload: Partial<EmailSettings> = {
        host: emailForm.host.trim(),
        port: emailForm.port,
        username: emailForm.username.trim(),
        use_tls: emailForm.use_tls,
        from_email: emailForm.from_email.trim(),
      }
      if (emailForm.password) payload.password = emailForm.password
      await api.updateEmailSettings(account.uuid, payload)
      setEmailForm((f) => ({ ...f, password: '' }))
      setHasPassword(!!payload.password)
      setEmailSuccess('Email settings saved.')
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Failed to save email settings')
    } finally {
      setEmailSaving(false)
    }
  }

  async function onTestSend() {
    if (!account) return
    const recipient = testRecipient.trim()
    if (!recipient) return
    setEmailError('')
    setEmailSuccess('')
    setTesting(true)
    try {
      await api.testEmailSettings(account.uuid, recipient)
      setEmailSuccess('Test email sent.')
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Failed to send test email')
    } finally {
      setTesting(false)
    }
  }

  return (
    <>
      <Breadcrumbs items={[{ label: 'Dashboard', to: `${base}` }]} />
      <h1>Settings</h1>
      <p className="page-subtitle">Update your account details.</p>

      {error && <div className="alert">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      <div className="tabs">
        <button
          type="button"
          className={tab === 'account' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setTab('account')}
        >
          Account
        </button>
        <button
          type="button"
          className={tab === 'email' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setTab('email')}
        >
          Email
        </button>
      </div>

      {tab === 'account' && (
      <form className="panel form-grid" onSubmit={onSubmit}>
        <label>
          Username
          <input
            value={form.username}
            onChange={(e) => set('username', e.target.value)}
            required
            autoComplete="username"
          />
        </label>
        <label>
          First name
          <input value={form.first_name} onChange={(e) => set('first_name', e.target.value)} autoComplete="given-name" />
        </label>
        <label>
          Last name
          <input value={form.last_name} onChange={(e) => set('last_name', e.target.value)} autoComplete="family-name" />
        </label>
        <label>
          Email
          <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" />
        </label>
        <label>
          New password (leave empty to keep current)
          <PasswordField
            value={form.password}
            onChange={(v) => set('password', v)}
            placeholder="••••••"
            autoComplete="new-password"
          />
        </label>
        <div className="form-actions">
          <button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
      )}

      {tab === 'email' && (
      <>
      {emailError && <div className="alert">{emailError}</div>}
      {emailSuccess && <div className="alert alert-success">{emailSuccess}</div>}
      {account && emailLoaded && (
        <form className="panel form-grid" onSubmit={onEmailSubmit}>
          <label>
            SMTP host
            <input
              value={emailForm.host}
              onChange={(e) => setEmail('host', e.target.value)}
              placeholder="smtp.example.com"
            />
          </label>
          <label>
            SMTP port
            <input
              type="number"
              min={1}
              max={65535}
              value={emailForm.port}
              onChange={(e) => setEmail('port', Number(e.target.value) || 0)}
            />
          </label>
          <label>
            SMTP username
            <input
              value={emailForm.username}
              onChange={(e) => setEmail('username', e.target.value)}
              autoComplete="off"
            />
          </label>
          <label>
            SMTP password (leave empty to keep current)
            <PasswordField
              value={emailForm.password}
              onChange={(v) => setEmail('password', v)}
              placeholder={hasPassword ? '••••••' : ''}
              autoComplete="new-password"
            />
          </label>
          <label>
            From email
            <input
              type="email"
              value={emailForm.from_email}
              onChange={(e) => setEmail('from_email', e.target.value)}
              placeholder="noreply@example.com"
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={emailForm.use_tls}
              onChange={(e) => setEmail('use_tls', e.target.checked)}
            />
            Use TLS
          </label>
          <div className="form-actions">
            <button type="submit" disabled={emailSaving}>
              {emailSaving ? 'Saving…' : 'Save email settings'}
            </button>
          </div>
        </form>
      )}
      {account && (
        <div className="panel">
          <div className="form-grid">
            <label>
              Test recipient
              <input
                type="email"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <div className="form-actions">
              <button type="button" onClick={onTestSend} disabled={testing || !testRecipient.trim()}>
                {testing ? 'Sending…' : 'Send test email'}
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </>
  )
}