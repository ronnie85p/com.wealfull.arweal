import { useEffect, useState } from 'react'
import { Address } from '../api'
import { api } from '../api'

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

interface AddressesProps {
  userId: number
  showHeading?: boolean
}

export default function Addresses({ userId, showHeading = true }: AddressesProps) {
  const [items, setItems] = useState<Address[]>([])
  const [editing, setEditing] = useState<Address | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function load() {
    api.addresses(userId).then(setItems).catch((e) => setError(e.message))
  }

  useEffect(load, [userId])

  function set<K extends keyof typeof emptyForm>(key: K, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function startEdit(a: Address) {
    setEditing(a)
    setForm({
      country: a.country,
      state: a.state,
      city: a.city,
      street: a.street,
      building: a.building,
      unit: a.unit,
      zip: a.zip,
      is_default: a.is_default,
    })
  }

  function cancelEdit() {
    setEditing(null)
    setError('')
  }

  async function onSubmit() {
    if (!editing) return
    if (!form.street.trim() || !form.city.trim()) {
      setError('Street and city are required.')
      return
    }
    setError('')
    setSaving(true)
    try {
      const payload = { ...form, street: form.street.trim(), city: form.city.trim() }
      await api.updateAddress(userId, editing.id, payload)
      setEditing(null)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save address')
    } finally {
      setSaving(false)
    }
  }

  async function onDelete(a: Address) {
    if (!confirm(`Delete address "${a.street}, ${a.city}"?`)) return
    try {
      await api.deleteAddress(userId, a.id)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete address')
    }
  }

  return (
    <div className="panel">
      {showHeading && (
        <div className="panel-head">
          <h2>Addresses</h2>
        </div>
      )}
      {error && <div className="alert">{error}</div>}

      {editing && (
        <div className="address-form">
          <div className="create-user-grid">
            <input placeholder="Country" value={form.country} onChange={(e) => set('country', e.target.value)} />
            <input placeholder="State" value={form.state} onChange={(e) => set('state', e.target.value)} />
            <input placeholder="City *" value={form.city} onChange={(e) => set('city', e.target.value)} />
            <input placeholder="Street *" value={form.street} onChange={(e) => set('street', e.target.value)} />
            <input placeholder="Building" value={form.building} onChange={(e) => set('building', e.target.value)} />
            <input placeholder="Unit" value={form.unit} onChange={(e) => set('unit', e.target.value)} />
            <input placeholder="Zip" value={form.zip} onChange={(e) => set('zip', e.target.value)} />
          </div>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.is_default}
              onChange={(e) => set('is_default', e.target.checked)}
            />
            Default address
          </label>
          <div className="address-form-actions">
            <button type="button" className="button btn-sm" onClick={onSubmit} disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button type="button" className="btn-secondary btn-sm" onClick={cancelEdit}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <table className="table">
        <thead>
          <tr>
            <th>Address</th>
            <th>Zip</th>
            <th>Default</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((a) => (
            <tr key={a.id}>
              <td>
                {a.building ? `${a.street} ${a.building}` : a.street}
                {a.unit ? `, unit ${a.unit}` : ''} · {a.city}
              </td>
              <td>{a.zip || '—'}</td>
              <td>{a.is_default ? '✓' : '—'}</td>
              <td className="actions-cell">
                <button className="btn-secondary btn-sm" onClick={() => startEdit(a)}>
                  Edit
                </button>
                <button className="btn-danger" onClick={() => onDelete(a)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={4} className="empty">
                No addresses for this customer.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}