import { FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, User } from '../api'
import PasswordField from '../components/PasswordField'
import { useAccountContext } from '../components/AccountContext'
import { useAccountBase } from '../lib/account'

const emptyForm = { username: '', password: '', first_name: '', last_name: '', email: '' }

export default function Customers() {
  const [items, setItems] = useState<User[]>([])
  const base = useAccountBase()
  const { account } = useAccountContext()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    const timer = setTimeout(() => {
      api
        .customers(query.trim(), account?.uuid ?? '')
        .then(setItems)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(timer)
  }, [query, account?.uuid])

  function set<K extends keyof typeof emptyForm>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    if (!form.username.trim() || form.password.length < 6) {
      setFormError('Username is required and password must be at least 6 characters.')
      return
    }
    setFormError('')
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
      setModalOpen(false)
      setForm(emptyForm)
      setQuery(user.username)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create customer')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Customers</h1>
          <p className="page-subtitle no-margin">All customers of your integration.</p>
        </div>
        <button type="button" className="button" onClick={() => setModalOpen(true)}>
          + Create customer
        </button>
      </div>

      <input
        className="search-input"
        placeholder="Search customers by name or email…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {error && <div className="alert">{error}</div>}

      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Username</th>
              <th>Email</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>
                  {u.first_name} {u.last_name}
                </td>
                <td>{u.username}</td>
                <td>{u.email || '—'}</td>
                <td className="actions-cell">
                  <Link to={`${base}/customers/${u.id}`} className="btn-secondary btn-sm">
                    View
                  </Link>
                  <Link to={`${base}/customers/${u.id}/edit`} className="btn-secondary btn-sm">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={5} className="empty">
                  No customers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>New customer</h3>
            <form className="modal-form" onSubmit={onCreate}>
              <label className="field-label">
                <span>Username *</span>
                <input
                  value={form.username}
                  onChange={(e) => set('username', e.target.value)}
                  placeholder="e.g. john_doe"
                  autoFocus
                  required
                />
              </label>
              <label className="field-label">
                <span>Password * (min 6)</span>
                <PasswordField value={form.password} onChange={(v) => set('password', v)} placeholder="••••••" required />
              </label>
              <label className="field-label">
                <span>First name</span>
                <input value={form.first_name} onChange={(e) => set('first_name', e.target.value)} placeholder="John" />
              </label>
              <label className="field-label">
                <span>Last name</span>
                <input value={form.last_name} onChange={(e) => set('last_name', e.target.value)} placeholder="Doe" />
              </label>
              <label className="field-label">
                <span>Email</span>
                <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="john@example.com" />
              </label>
              {formError && <div className="alert">{formError}</div>}
              <div className="modal-actions">
                <button type="submit" disabled={saving}>
                  {saving ? 'Creating…' : 'Create customer'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}