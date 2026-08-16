import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import Breadcrumbs from '../components/Breadcrumbs'
import { useAccountContext } from '../components/AccountContext'
import { useAccountBase } from '../lib/account'

const emptyForm = { email: '', first_name: '', last_name: '' }

export default function InviteEmployer() {
  const base = useAccountBase()
  const { account } = useAccountContext()
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [invited, setInvited] = useState<string | null>(null)

  function set<K extends keyof typeof emptyForm>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.email.trim()) {
      setError('Email is required.')
      return
    }
    setError('')
    setSaving(true)
    try {
      await api.inviteEmployer({
        email: form.email.trim(),
        first_name: form.first_name.trim() || undefined,
        last_name: form.last_name.trim() || undefined,
        account_id: account?.uuid ?? null,
      })
      setInvited(form.email.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite employer')
    } finally {
      setSaving(false)
    }
  }

  if (invited) {
    return (
      <>
        <Breadcrumbs
          items={[
            { label: 'Dashboard', to: `${base}` },
            { label: 'Employers', to: `${base}/employers` },
          ]}
        />
        <h1>Invitation sent</h1>
        <p className="page-subtitle">
          An invitation email has been sent to <strong>{invited}</strong>.
        </p>
        <p>
          <Link to={`${base}/employers`} className="button">
            Back to employers
          </Link>
        </p>
      </>
    )
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Dashboard', to: `${base}` },
          { label: 'Employers', to: `${base}/employers` },
        ]}
      />
      <h1>Invite employer</h1>
      <p className="page-subtitle">Send an email invitation to join Wealfull CRM.</p>

      <form className="panel form-grid" onSubmit={onSubmit}>
        <label>
          Email *
          <input
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            placeholder="john@example.com"
            required
            autoFocus
          />
        </label>
        <label>
          First name
          <input value={form.first_name} onChange={(e) => set('first_name', e.target.value)} placeholder="John" />
        </label>
        <label>
          Last name
          <input value={form.last_name} onChange={(e) => set('last_name', e.target.value)} placeholder="Doe" />
        </label>
        {error && <div className="alert form-alert">{error}</div>}
        <div className="form-actions">
          <button type="submit" disabled={saving}>
            {saving ? 'Sending…' : 'Send invitation'}
          </button>
          <Link to={`${base}/employers`} className="btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </>
  )
}