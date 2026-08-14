import { FormEvent, useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../components/AuthContext'
import Breadcrumbs from '../components/Breadcrumbs'
import PasswordField from '../components/PasswordField'

export default function Settings() {
  const { user } = useAuth()
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

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
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

  return (
    <>
      <Breadcrumbs items={[{ label: 'Dashboard', to: '/app' }]} />
      <h1>Settings</h1>
      <p className="page-subtitle">Update your account details.</p>

      {error && <div className="alert">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
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
    </>
  )
}
