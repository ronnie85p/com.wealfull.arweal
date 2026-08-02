import { FormEvent, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, Address, PlaceSuggestion, User } from '../api'
import Breadcrumbs from '../components/Breadcrumbs'
import UserPicker from '../components/UserPicker'

const emptyForm = {
  external_id: '',
  description: '',
  amount: '',
  currency: 'EUR',
  status: 'pending',
}

const emptyAddressForm = {
  state: '',
  city: '',
  street: '',
  room: '',
  postal_code: '',
  is_default: false,
}

const addressLine = (a: Address) =>
  [a.street, a.room ? `room ${a.room}` : ''].filter(Boolean).join(', ')

const addressMeta = (a: Address) =>
  [a.city, a.state, a.postal_code].filter(Boolean).join(', ')

export default function CreateOrder() {
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyForm)
  const [user, setUser] = useState<User | null>(null)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [addressDialog, setAddressDialog] = useState(false)
  const [addressForm, setAddressForm] = useState(emptyAddressForm)
  const [addressError, setAddressError] = useState('')
  const [addressSaving, setAddressSaving] = useState(false)
  const [addressSearch, setAddressSearch] = useState('')
  const [addressManual, setAddressManual] = useState(false)
  const [placeResults, setPlaceResults] = useState<PlaceSuggestion[]>([])
  const [placesLoading, setPlacesLoading] = useState(false)
  const searchSeq = useRef(0)
  const [addressPicker, setAddressPicker] = useState(false)
  const [pickerQuery, setPickerQuery] = useState('')
  const [chosenAddress, setChosenAddress] = useState<Address | null>(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) {
      setAddresses([])
      setChosenAddress(null)
      return
    }
    setChosenAddress(null)
    api.addresses(user.id).then(setAddresses).catch(() => setAddresses([]))
  }, [user])

  useEffect(() => {
    const q = addressSearch.trim()
    const seq = ++searchSeq.current
    if (!q) {
      setPlaceResults([])
      setPlacesLoading(false)
      return
    }
    const t = setTimeout(async () => {
      setPlacesLoading(true)
      try {
        const res = await api.placesAutocomplete(q)
        if (seq !== searchSeq.current) return
        setPlaceResults(res.results)
      } catch {
        if (seq !== searchSeq.current) return
        setPlaceResults([])
      } finally {
        if (seq === searchSeq.current) setPlacesLoading(false)
      }
    }, 350)
    return () => clearTimeout(t)
  }, [addressSearch])

  const currentAddress = chosenAddress ?? addresses.find((a) => a.is_default) ?? null

  function openAddressDialog() {
    setAddressForm(emptyAddressForm)
    setAddressError('')
    setAddressSearch('')
    setAddressManual(false)
    setAddressDialog(true)
  }

  async function applyPlace(p: PlaceSuggestion) {
    try {
      const d = await api.placeDetails(p.place_id)
      setAddressForm((f) => ({
        ...f,
        state: d.state,
        city: d.city,
        street: d.street,
        postal_code: d.postal_code,
      }))
      setAddressSearch('')
      setPlaceResults([])
    } catch {
      setAddressSearch('')
      setPlaceResults([])
    }
  }

  async function submitAddress(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    if (!addressForm.street.trim() || !addressForm.city.trim()) {
      setAddressError('Street and city are required.')
      return
    }
    setAddressError('')
    setAddressSaving(true)
    try {
      await api.createAddress(user.id, {
        ...addressForm,
        street: addressForm.street.trim(),
        city: addressForm.city.trim(),
      })
      setAddressDialog(false)
      setAddresses(await api.addresses(user.id))
    } catch (err) {
      setAddressError(err instanceof Error ? err.message : 'Failed to create address')
    } finally {
      setAddressSaving(false)
    }
  }

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
      await api.createOrder({
        ...form,
        amount: String(amount),
        user: user?.id,
      })
      navigate('/app/orders')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create order')
      setSaving(false)
    }
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Dashboard', to: '/app' },
          { label: 'Orders', to: '/app/orders' },
        ]}
      />
      <h1>New order</h1>
      <p className="page-subtitle">Create a new order for your integration.</p>

      <form className="panel form-grid" onSubmit={onSubmit}>
        <label>
          Customer
          <UserPicker value={user} onChange={setUser} />
        </label>
        {user && (
          <div className="panel order-customer">
            <div className="order-customer-head">
              <div>
                <h3>
                  {user.first_name || user.username} {user.last_name}
                </h3>
                <p className="muted no-margin">
                  @{user.username}
                  {user.email ? ` · ${user.email}` : ''}
                </p>
              </div>
              <div className="order-customer-actions">
                <Link to={`/app/customers/${user.id}/edit`} className="btn-secondary btn-sm">
                  Edit
                </Link>
                <button type="button" className="btn-danger" onClick={() => setUser(null)}>
                  Delete
                </button>
              </div>
            </div>
            {currentAddress ? (
              <div className="order-address-current">
                <div className="order-address-main">
                  <strong>{addressLine(currentAddress)}</strong>
                  <span className="muted">
                    {addressMeta(currentAddress)}
                    {currentAddress.is_default ? ' · Default' : ''}
                  </span>
                </div>
                {addresses.length > 1 && (
                  <button type="button" className="btn-secondary btn-sm" onClick={() => { setPickerQuery(''); setAddressPicker(true) }}>
                    Choose another address
                  </button>
                )}
              </div>
            ) : (
              <p className="muted no-margin">No addresses yet.</p>
            )}
            <div>
              <button type="button" className="btn-secondary btn-sm" onClick={openAddressDialog}>
                + New address
              </button>
            </div>
          </div>
        )}
        {addressDialog && (
          <div className="modal-overlay" onClick={() => !addressSaving && setAddressDialog(false)}>
            <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submitAddress}>
              <h3>New address</h3>
              <p className="muted modal-subtitle">
                for {user ? `${user.first_name || user.username} ${user.last_name}`.trim() : 'customer'}
              </p>
              <div className="address-search">
                <input
                  className="search-input"
                  placeholder="Search Google for an address…"
                  value={addressSearch}
                  onChange={(e) => setAddressSearch(e.target.value)}
                  autoFocus
                />
                {placesLoading && <span className="address-search-spinner" />}
                {addressSearch.trim() && placeResults.length > 0 && (
                  <ul className="address-picker address-picker--dropdown">
                    {placeResults.map((p) => (
                      <li key={p.place_id}>
                        <button
                          type="button"
                          className="address-picker-item"
                          onClick={() => applyPlace(p)}
                        >
                          <strong>{p.main_text}</strong>
                          <span className="muted">{p.secondary_text || p.description}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={addressManual}
                  onChange={(e) => {
                    setAddressManual(e.target.checked)
                    if (e.target.checked) setAddressSearch('')
                  }}
                />
                Manual configuration
              </label>
              {addressManual && (
                <div className="form-grid">
                  <div className="form-grid-row-stcity">
                    <label>
                      State
                      <input value={addressForm.state} onChange={(e) => setAddressForm((f) => ({ ...f, state: e.target.value }))} placeholder="State" />
                    </label>
                    <label>
                      City *
                      <input value={addressForm.city} onChange={(e) => setAddressForm((f) => ({ ...f, city: e.target.value }))} placeholder="Berlin" required />
                    </label>
                  </div>
                  <div className="form-grid-row">
                    <label>
                      Street *
                      <input value={addressForm.street} onChange={(e) => setAddressForm((f) => ({ ...f, street: e.target.value }))} placeholder="Main St 12" required />
                    </label>
                    <label>
                      Room
                      <input value={addressForm.room} onChange={(e) => setAddressForm((f) => ({ ...f, room: e.target.value }))} placeholder="Room" />
                    </label>
                    <label>
                      Zip
                      <input value={addressForm.postal_code} onChange={(e) => setAddressForm((f) => ({ ...f, postal_code: e.target.value }))} placeholder="10115" />
                    </label>
                  </div>
                </div>
              )}
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={addressForm.is_default}
                  onChange={(e) => setAddressForm((f) => ({ ...f, is_default: e.target.checked }))}
                />
                Default address
              </label>
              {addressError && <div className="alert form-alert">{addressError}</div>}
              <div className="form-actions">
                <button type="submit" disabled={addressSaving}>
                  {addressSaving ? 'Creating…' : 'Create address'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setAddressDialog(false)} disabled={addressSaving}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
        {addressPicker && (
          <div className="modal-overlay" onClick={() => setAddressPicker(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3>Choose address</h3>
              <input
                className="search-input"
                placeholder="Search address…"
                value={pickerQuery}
                onChange={(e) => setPickerQuery(e.target.value)}
                autoFocus
              />
              <ul className="address-picker">
                {addresses
                  .filter((a) => {
                    const q = pickerQuery.trim().toLowerCase()
                    if (!q) return true
                    return `${addressLine(a)} ${addressMeta(a)}`.toLowerCase().includes(q)
                  })
                  .map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        className={`address-picker-item${a.id === currentAddress?.id ? ' active' : ''}`}
                        onClick={() => {
                          setChosenAddress(a)
                          setAddressPicker(false)
                        }}
                      >
                        <strong>{addressLine(a)}</strong>
                        <span className="muted">
                          {addressMeta(a)}
                          {a.is_default ? ' · Default' : ''}
                        </span>
                      </button>
                    </li>
                  ))}
              </ul>
              {addresses.length === 0 && <p className="muted no-margin">No addresses yet.</p>}
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setAddressPicker(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
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
            {saving ? 'Saving…' : 'Create order'}
          </button>
          <Link to="/app/orders" className="btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </>
  )
}