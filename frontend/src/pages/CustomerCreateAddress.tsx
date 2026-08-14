import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, User } from '../api'
import Breadcrumbs from '../components/Breadcrumbs'

const emptyForm = {
  country: '',
  state: '',
  city: '',
  street: '',
  building: '',
  unit: '',
  zip: '',
  is_default: false,
}

export default function CustomerCreateAddress() {
  const { id } = useParams()
  const customerId = Number(id)
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!customerId) return
    api.user(customerId).then(setUser).catch(() => undefined)
  }, [customerId])

  function set<K extends keyof typeof emptyForm>(key: K, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.street.trim() || !form.city.trim()) {
      setError('Street and city are required.')
      return
    }
    setError('')
    setSaving(true)
    try {
      await api.createAddress(customerId, {
        country: form.country.trim(),
        state: form.state.trim(),
        city: form.city.trim(),
        street: form.street.trim(),
        building: form.building.trim(),
        unit: form.unit.trim(),
        zip: form.zip.trim(),
        is_default: form.is_default,
      })
      navigate(`/app/customers/${customerId}/addresses`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create address')
      setSaving(false)
    }
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Dashboard', to: '/app' },
          { label: 'Customers', to: '/app/customers' },
          { label: user ? `${user.first_name || user.username} ${user.last_name}`.trim() : '…', to: `/app/customers/${customerId}` },
          { label: 'Addresses', to: `/app/customers/${customerId}/addresses` },
          { label: 'New address' },
        ]}
      />
      <h1>New address</h1>
      <p className="page-subtitle">
        Add an address for {user ? `${user.first_name || user.username} ${user.last_name}`.trim() : 'this customer'}.
      </p>

      <form className="panel form-grid" onSubmit={onSubmit}>
        <label>
          Country
          <input value={form.country} onChange={(e) => set('country', e.target.value)} placeholder="USA" />
        </label>
        <label>
          State
          <input value={form.state} onChange={(e) => set('state', e.target.value)} placeholder="State / region" />
        </label>
        <label>
          City *
          <input value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Berlin" required />
        </label>
        <label>
          Street *
          <input value={form.street} onChange={(e) => set('street', e.target.value)} placeholder="Main St 12" required />
        </label>
        <label>
          Building
          <input value={form.building} onChange={(e) => set('building', e.target.value)} placeholder="Building" />
        </label>
        <label>
          Unit
          <input value={form.unit} onChange={(e) => set('unit', e.target.value)} placeholder="Unit / apartment" />
        </label>
        <label>
          Zip
          <input value={form.zip} onChange={(e) => set('zip', e.target.value)} placeholder="10115" />
        </label>
        <label className="checkbox-label form-checkbox">
          <input type="checkbox" checked={form.is_default} onChange={(e) => set('is_default', e.target.checked)} />
          Set as default address
        </label>
        {error && <div className="alert form-alert">{error}</div>}
        <div className="form-actions">
          <button type="submit" disabled={saving}>
            {saving ? 'Creating…' : 'Create address'}
          </button>
          <Link to={`/app/customers/${customerId}/addresses`} className="btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </>
  )
}
