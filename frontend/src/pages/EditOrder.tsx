import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import Breadcrumbs from '../components/Breadcrumbs'
import { useAccountBase } from '../lib/account'

const emptyForm = {
  external_id: '',
  description: '',
  amount: '',
  currency: 'EUR',
  status: 'pending',
}

export default function EditOrder() {
  const navigate = useNavigate()
  const base = useAccountBase()
  const { id } = useParams()
  const orderId = Number(id)

  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!orderId) {
      setError('Order not found.')
      return
    }
    api
      .order(orderId)
      .then((o) =>
        setForm({
          external_id: o.external_id,
          description: o.description,
          amount: o.amount,
          currency: o.currency,
          status: o.status,
        }),
      )
      .catch((e) => setError(e.message))
  }, [orderId])

  function set<K extends keyof typeof emptyForm>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const amount = Number(form.amount)
    if (!amount || amount <= 0) {
      setFormError('Enter a valid amount greater than 0.')
      return
    }
    setFormError('')
    setSaving(true)
    try {
      await api.updateOrder(orderId, { ...form, amount: String(amount) })
      navigate(`${base}/orders`)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update order')
      setSaving(false)
    }
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Dashboard', to: `${base}` },
          { label: 'Orders', to: `${base}/orders` },
        ]}
      />
      <h1>Edit order</h1>
      <p className="page-subtitle">Update the order details.</p>

      {error && <div className="alert">{error}</div>}
      {!error && (
        <form className="panel form-grid" onSubmit={onSubmit}>
          <label>
            Description
            <input
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="e.g. Enterprise plan"
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
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="canceled">Canceled</option>
            </select>
          </label>
          <label>
            External ID
            <input
              value={form.external_id}
              onChange={(e) => set('external_id', e.target.value)}
              placeholder="ORD-1001"
            />
          </label>
          {formError && <div className="alert form-alert">{formError}</div>}
          <div className="form-actions">
            <button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <Link to={`${base}/orders`} className="btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      )}
    </>
  )
}