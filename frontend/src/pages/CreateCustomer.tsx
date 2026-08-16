import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import Breadcrumbs from '../components/Breadcrumbs'
import PasswordField from '../components/PasswordField'
import { useAccountContext } from '../components/AccountContext'
import { useAccountBase } from '../lib/account'

const emptyForm = { username: '', password: '', first_name: '', last_name: '', email: '' }

export default function CreateCustomer() {
  const navigate = useNavigate()
  const base = useAccountBase()
  const { account } = useAccountContext()
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function set<K extends keyof typeof emptyForm>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.username.trim() || form.password.length < 6) {
      setError('Username is required and password must be at least 6 characters.')
      return
    }
    setError('')
    setSaving(true)
    try {
      const user = await api.createCustomer(
        {
          username: form.username.trim(),
          password: form.password,
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim(),
        },
        account?.uuid ?? '',
      )
      navigate(`${base}/customers/${user.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create customer')
      setSaving(false)
    }
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Dashboard', to: `${base}` },
          { label: 'Customers', to: `${base}/customers` },
        ]}
      />
      <h1>New customer</h1>
      <p className="page-subtitle">Create a new customer account.</p>

      <form className="panel form-grid" onSubmit={onSubmit}>
        <label>
          Username *
          <input value={form.username} onChange={(e) => set('username', e.target.value)} placeholder="e.g. john_doe" required />
        </label>
        <label>
          Password * (min 6)
          <PasswordField value={form.password} onChange={(v) => set('password', v)} placeholder="••••••" required />
        </label>
        <label>
          First name
          <input value={form.first_name} onChange={(e) => set('first_name', e.target.value)} placeholder="John" />
        </label>
        <label>
          Last name
          <input value={form.last_name} onChange={(e) => set('last_name', e.target.value)} placeholder="Doe" />
        </label>
        <label>
          Email
          <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="john@example.com" />
        </label>
        {error && <div className="alert form-alert">{error}</div>}
        <div className="form-actions">
          <button type="submit" disabled={saving}>
            {saving ? 'Creating…' : 'Create customer'}
          </button>
          <Link to={`${base}/customers`} className="btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </>
  )
}