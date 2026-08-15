import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import Breadcrumbs from '../components/Breadcrumbs'
import { useAccountBase } from '../lib/account'

const emptyForm = {
  name: '',
  description: '',
  amount: '',
  currency: 'EUR',
  status: 'active',
}

export default function EditService() {
  const navigate = useNavigate()
  const base = useAccountBase()
  const { id } = useParams()
  const serviceId = Number(id)

  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!serviceId) {
      setError('Service not found.')
      return
    }
    api
      .service(serviceId)
      .then((s) =>
        setForm({
          name: s.name,
          description: s.description,
          amount: s.amount,
          currency: s.currency,
          status: s.status,
        }),
      )
      .catch((e) => setError(e.message))
  }, [serviceId])

  function set<K extends keyof typeof emptyForm>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const amount = Number(form.amount)
    if (!form.name.trim()) {
      setFormError('Name is required.')
      return
    }
    if (!amount || amount <= 0) {
      setFormError('Enter a valid amount greater than 0.')
      return
    }
    setFormError('')
    setSaving(true)
    try {
      await api.updateService(serviceId, {
        name: form.name.trim(),
        description: form.description.trim(),
        amount: String(amount),
        currency: form.currency,
        status: form.status,
      })
      navigate(`${base}/services`)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update service')
      setSaving(false)
    }
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Dashboard', to: `${base}` },
          { label: 'Services', to: `${base}/services` },
        ]}
      />
      <h1>Edit service</h1>
      <p className="page-subtitle">Update the service details.</p>

      {error && <div className="alert">{error}</div>}
      {!error && (
        <form className="panel form-grid" onSubmit={onSubmit}>
          <label>
            Name *
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Website development"
              required
            />
          </label>
          <label>
            Description
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="What does this service include?"
              rows={3}
            />
          </label>
          <label>
            Amount *
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.amount}
              onChange={(e) => set('amount', e.target.value)}
              placeholder="0.00"
              required
            />
          </label>
          <label>
            Currency
            <select value={form.currency} onChange={(e) => set('currency', e.target.value)}>
              <option>EUR</option>
              <option>USD</option>
              <option>GBP</option>
            </select>
          </label>
          <label>
            Status
            <select value={form.status} onChange={(e) => set('status', e.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          {formError && <div className="alert form-alert">{formError}</div>}
          <div className="form-actions">
            <button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <Link to={`${base}/services`} className="btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      )}
    </>
  )
}