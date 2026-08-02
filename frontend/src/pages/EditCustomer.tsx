import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import Breadcrumbs from '../components/Breadcrumbs'

const emptyForm = { username: '', password: '', first_name: '', last_name: '', email: '' }

export default function EditCustomer() {
  const navigate = useNavigate()
  const { id } = useParams()
  const customerId = Number(id)

  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!customerId) {
      setError('Customer not found.')
      return
    }
    api
      .user(customerId)
      .then((u) =>
        setForm({
          username: u.username,
          password: '',
          first_name: u.first_name,
          last_name: u.last_name,
          email: u.email,
        }),
      )
      .catch((e) => setError(e.message))
  }, [customerId])

  function set<K extends keyof typeof emptyForm>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    try {
      await api.updateUser(customerId, {
        username: form.username.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        password: form.password || undefined,
      })
      navigate(`/app/customers/${customerId}`)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update customer')
      setSaving(false)
    }
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Dashboard', to: '/app' },
          { label: 'Customers', to: '/app/customers' },
        ]}
      />
      <h1>Edit customer</h1>
      <p className="page-subtitle">Update the customer details.</p>

      {error && <div className="alert">{error}</div>}
      {!error && (
        <form className="panel form-grid" onSubmit={onSubmit}>
          <label>
            Username *
            <input value={form.username} onChange={(e) => set('username', e.target.value)} required />
          </label>
          <label>
            New password (leave empty to keep current)
            <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="••••••" />
          </label>
          <label>
            First name
            <input value={form.first_name} onChange={(e) => set('first_name', e.target.value)} />
          </label>
          <label>
            Last name
            <input value={form.last_name} onChange={(e) => set('last_name', e.target.value)} />
          </label>
          <label>
            Email
            <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </label>
          {formError && <div className="alert form-alert">{formError}</div>}
          <div className="form-actions">
            <button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <Link to={`/app/customers/${customerId}`} className="btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      )}
    </>
  )
}