import { FormEvent, useEffect, useState } from 'react'
import { api, User } from '../api'
import PasswordField from '../components/PasswordField'
import { useAccountContext } from '../components/AccountContext'

const emptyForm = { username: '', password: '', first_name: '', last_name: '', email: '' }
const emptyInvite = { email: '', first_name: '', last_name: '' }

export default function Employers() {
  const [items, setItems] = useState<User[]>([])
  const { account } = useAccountContext()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [invite, setInvite] = useState(emptyInvite)
  const [inviteError, setInviteError] = useState('')
  const [inviting, setInviting] = useState(false)
  const [invited, setInvited] = useState<string | null>(null)

  function load() {
    setLoading(true)
    api
      .searchUsers(query.trim())
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const timer = setTimeout(load, 250)
    return () => clearTimeout(timer)
  }, [query])

  function set<K extends keyof typeof emptyForm>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function setInviteField<K extends keyof typeof emptyInvite>(key: K, value: string) {
    setInvite((f) => ({ ...f, [key]: value }))
  }

  async function onInvite(e: FormEvent) {
    e.preventDefault()
    if (!invite.email.trim()) {
      setInviteError('Email is required.')
      return
    }
    setInviteError('')
    setInviting(true)
    try {
      await api.inviteEmployer({
        email: invite.email.trim(),
        first_name: invite.first_name.trim() || undefined,
        last_name: invite.last_name.trim() || undefined,
        account_id: account?.uuid ?? null,
      })
      setInvited(invite.email.trim())
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to invite employer')
    } finally {
      setInviting(false)
    }
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
      setFormError(err instanceof Error ? err.message : 'Failed to create employer')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Employers</h1>
          <p className="page-subtitle no-margin">Executors available for your orders.</p>
        </div>
        <div className="page-head-actions">
          <button type="button" className="button" onClick={() => setInviteOpen(true)}>
            + Invite employer
          </button>
          <button type="button" className="button" onClick={() => setModalOpen(true)}>
            + Create employer
          </button>
        </div>
      </div>

      <input
        className="search-input"
        placeholder="Search employers by name or email…"
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
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={4} className="empty">
                  No employers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>New employer</h3>
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
                  {saving ? 'Creating…' : 'Create employer'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    {inviteOpen && (
        <div className="modal-overlay" onClick={() => setInviteOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            {invited ? (
              <>
                <h3>Invitation sent</h3>
                <p className="page-subtitle">
                  An invitation email has been sent to <strong>{invited}</strong>.
                </p>
                <div className="modal-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setInviteOpen(false)
                      setInvited(null)
                      setInvite(emptyInvite)
                    }}
                  >
                    Done
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3>Invite employer</h3>
                <form className="modal-form" onSubmit={onInvite}>
                  <label className="field-label">
                    <span>Email *</span>
                    <input
                      type="email"
                      value={invite.email}
                      onChange={(e) => setInviteField('email', e.target.value)}
                      placeholder="john@example.com"
                      autoFocus
                      required
                    />
                  </label>
                  <label className="field-label">
                    <span>First name</span>
                    <input value={invite.first_name} onChange={(e) => setInviteField('first_name', e.target.value)} placeholder="John" />
                  </label>
                  <label className="field-label">
                    <span>Last name</span>
                    <input value={invite.last_name} onChange={(e) => setInviteField('last_name', e.target.value)} placeholder="Doe" />
                  </label>
                  {inviteError && <div className="alert">{inviteError}</div>}
                  <div className="modal-actions">
                    <button type="submit" disabled={inviting}>
                      {inviting ? 'Sending…' : 'Send invitation'}
                    </button>
                    <button type="button" className="btn-secondary" onClick={() => setInviteOpen(false)}>
                      Cancel
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}