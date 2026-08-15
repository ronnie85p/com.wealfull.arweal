import { FormEvent, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, Address, PlaceSuggestion, User } from '../api'
import Breadcrumbs from '../components/Breadcrumbs'
import ExecutorPicker from '../components/ExecutorPicker'
import UserPicker from '../components/UserPicker'
import { useAccountBase } from '../lib/account'

const emptyAddressForm = {
  country: '',
  state: '',
  city: '',
  street: '',
  building: '',
  unit: '',
  zip: '',
  is_default: false,
}

const emptyEditForm = { first_name: '', last_name: '' }

const addressLine = (a: Address) =>
  [a.building ? `${a.street} ${a.building}` : a.street, a.unit ? `unit ${a.unit}` : ''].filter(Boolean).join(', ')

const addressMeta = (a: Address) =>
  [a.city, a.state, a.zip].filter(Boolean).join(', ')

const DURATION_UNITS = [
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'months', label: 'Months' },
]

const MATERIAL_OPTIONS = [
  { value: 'included', label: 'Included' },
  { value: 'not_included', label: 'Not included' },
  { value: 'finish_not_included', label: 'Finish not included' },
]

interface ItemDraft {
  name: string
  description: string
  quantity: string
  unit: string
  amount: string
  discount: string
  tax: string
}

const ITEM_UNITS = [
  { value: 'pc', label: 'pc' },
  { value: 'in', label: 'in' },
  { value: 'ft', label: 'ft' },
  { value: 'm', label: 'm' },
  { value: 'in2', label: 'in²' },
  { value: 'ft2', label: 'ft²' },
  { value: 'm2', label: 'm²' },
]

const emptyItem = (): ItemDraft => ({
  name: '',
  description: '',
  quantity: '1',
  unit: 'pc',
  amount: '',
  discount: '',
  tax: '',
})

function maskAmount(raw: string) {
  if (raw === '') return ''
  const n = Number(raw)
  if (Number.isNaN(n)) return raw
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n)
  return raw.endsWith('.') ? `${formatted}.` : formatted
}

function unmaskAmount(masked: string) {
  const cleaned = masked.replace(/[^\d.]/g, '')
  const firstDot = cleaned.indexOf('.')
  if (firstDot === -1) return cleaned
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '')
}

export default function CreateOrder() {
  const navigate = useNavigate()
  const base = useAccountBase()
  const [user, setUser] = useState<User | null>(null)
  const [projName, setProjName] = useState('')
  const [projStart, setProjStart] = useState('')
  const [projDuration, setProjDuration] = useState('')
  const [projDurationTo, setProjDurationTo] = useState('')
  const [projDurationUnit, setProjDurationUnit] = useState('days')
  const [projDetails, setProjDetails] = useState('')
  const [materials, setMaterials] = useState('included')
  const [notes, setNotes] = useState('')
  const [comment, setComment] = useState('')
  const [executors, setExecutors] = useState<User[]>([])
  const [availFrom, setAvailFrom] = useState('')
  const [availTo, setAvailTo] = useState('')
  const [items, setItems] = useState<ItemDraft[]>([emptyItem()])
  const [openItemMenu, setOpenItemMenu] = useState<number | null>(null)
  const [expanded, setExpanded] = useState<Record<number, string[]>>({})
  const [itemNotice, setItemNotice] = useState<string | null>(null)
  const [itemNoticeError, setItemNoticeError] = useState(false)
  const itemsRef = useRef<HTMLDivElement>(null)
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
  const [editDialog, setEditDialog] = useState(false)
  const [editForm, setEditForm] = useState(emptyEditForm)
  const [editError, setEditError] = useState('')
  const [editSaving, setEditSaving] = useState(false)

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
    function onClick(e: MouseEvent) {
      if (itemsRef.current && !itemsRef.current.contains(e.target as Node)) {
        setOpenItemMenu(null)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

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
    setAddressForm({ ...emptyAddressForm, is_default: addresses.length === 0 })
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
        zip: d.postal_code,
      }))
      setAddressSearch('')
      setPlaceResults([])
    } catch {
      setAddressSearch('')
      setPlaceResults([])
    }
  }

  function chooseAddress(a: Address) {
    setChosenAddress(a)
    setAddressPicker(false)
  }

  function openEditDialog() {
    if (!user) return
    setEditForm({
      first_name: user.first_name,
      last_name: user.last_name,
    })
    setEditError('')
    setEditDialog(true)
  }

  async function submitEdit(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setEditError('')
    setEditSaving(true)
    try {
      const updated = await api.updateUser(user.id, {
        first_name: editForm.first_name.trim(),
        last_name: editForm.last_name.trim(),
      })
      setUser(updated)
      setEditDialog(false)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update customer')
    } finally {
      setEditSaving(false)
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

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    try {
      const newProject = await api.createProject({
        name: projName.trim() || 'Project',
        description: projDetails,
        start_time: projStart || null,
        duration: Number(projDuration) || 0,
        duration_to: Number(projDurationTo) || 0,
        duration_unit: projDurationUnit,
        available_from: availFrom || null,
        available_to: availTo || null,
      })
      await api.createOrder({
        amount: '0',
        materials,
        notes,
        comment,
        executors: executors.map((u) => u.id),
        items: items
          .filter((i) => i.name.trim())
          .map((i) => ({
            name: i.name.trim(),
            description: i.description,
            quantity: Number(i.quantity) || 1,
            unit: i.unit,
            amount: i.amount || '0',
            currency: 'EUR',
            discount: i.discount || '0',
            tax: i.tax || '0',
          })),
        user: user?.id,
        project: newProject.id,
        address: currentAddress
          ? {
              source: currentAddress.id,
              country: currentAddress.country,
              state: currentAddress.state,
              city: currentAddress.city,
              street: currentAddress.street,
              building: currentAddress.building,
              unit: currentAddress.unit,
              zip: currentAddress.zip,
            }
          : null,
      })
      navigate(`${base}/orders`)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create order')
      setSaving(false)
    }
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()])
  }

  function duplicateItem(index: number) {
    setItems((prev) => [...prev.slice(0, index + 1), { ...prev[index] }, ...prev.slice(index + 1)])
  }

  function updateItem(index: number, patch: Partial<ItemDraft>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)))
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  function isOpen(index: number, field: string) {
    return (expanded[index] ?? []).includes(field)
  }

  function toggleField(index: number, field: string) {
    setExpanded((prev) => {
      const current = prev[index] ?? []
      const next = current.includes(field) ? current.filter((f) => f !== field) : [...current, field]
      return { ...prev, [index]: next }
    })
  }

  async function saveAsService(index: number) {
    const item = items[index]
    if (!item.name.trim()) {
      setItemNotice('Enter an item name before saving as service.')
      setItemNoticeError(true)
      return
    }
    setOpenItemMenu(null)
    try {
      await api.createService({
        name: item.name.trim(),
        description: item.description.trim(),
        amount: unmaskAmount(item.amount) || '0',
        currency: 'EUR',
        status: 'active',
      })
      setItemNotice(`"${item.name.trim()}" saved as service.`)
      setItemNoticeError(false)
    } catch (err) {
      setItemNotice(err instanceof Error ? err.message : 'Failed to save service.')
      setItemNoticeError(true)
    }
    window.setTimeout(() => setItemNotice(null), 4000)
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Dashboard', to: `${base}` },
          { label: 'Orders', to: `${base}/orders` },
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
                <button type="button" className="btn-secondary btn-sm" onClick={openEditDialog}>
                  Edit
                </button>
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
        <div className="project-field">
          <h3 className="form-title">Project</h3>
          <label>
            Name
            <input
              value={projName}
              onChange={(e) => setProjName(e.target.value)}
              placeholder="Project name"
            />
          </label>
          <div className="project-fields-row">
            <label className="project-field-start">
              Start time
              <input
                type="datetime-local"
                value={projStart}
                onChange={(e) => setProjStart(e.target.value)}
              />
            </label>
            <label className="project-field-duration">
              Duration
              <span className="duration-row">
                <input
                  type="number"
                  min="0"
                  placeholder="From"
                  value={projDuration}
                  onChange={(e) => setProjDuration(e.target.value)}
                />
                <span className="muted">–</span>
                <input
                  type="number"
                  min="0"
                  placeholder="To"
                  value={projDurationTo}
                  onChange={(e) => setProjDurationTo(e.target.value)}
                />
                <select
                  value={projDurationUnit}
                  onChange={(e) => setProjDurationUnit(e.target.value)}
                >
                  {DURATION_UNITS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </span>
            </label>
            <label className="project-field-duration">
              Available
              <span className="duration-row">
                <input
                  type="datetime-local"
                  placeholder="From"
                  value={availFrom}
                  onChange={(e) => setAvailFrom(e.target.value)}
                />
                <span className="muted">–</span>
                <input
                  type="datetime-local"
                  placeholder="To"
                  value={availTo}
                  onChange={(e) => setAvailTo(e.target.value)}
                />
              </span>
            </label>
          </div>
          <label>
            Project details
            <textarea
              rows={3}
              value={projDetails}
              onChange={(e) => setProjDetails(e.target.value)}
              placeholder="Describe the project scope…"
            />
          </label>
          <label>
            Materials
            <select value={materials} onChange={(e) => setMaterials(e.target.value)}>
              {MATERIAL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Notes
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes…"
            />
          </label>
          <label>
            Comment
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment…"
            />
          </label>
          <label>
            Executors
            <ExecutorPicker value={executors} onChange={setExecutors} />
          </label>
          <div className="order-items" ref={itemsRef}>
            <span className="field-label">Items</span>
            {itemNotice && (
              <span className={itemNoticeError ? 'item-notice item-notice--error' : 'item-notice'}>
                {itemNotice}
              </span>
            )}
            {items.length === 0 && (
              <p className="muted">No items yet. Add line items for this order.</p>
            )}
            {items.map((it, i) => (
              <div className="order-item-row" key={i}>
                <input
                  className="order-item-name"
                  placeholder="Item name"
                  value={it.name}
                  onChange={(e) => updateItem(i, { name: e.target.value })}
                />
                <button
                  type="button"
                  className="item-desc-btn"
                  title="Add description"
                  onClick={() => toggleField(i, 'desc')}
                >
                  {isOpen(i, 'desc') ? '−' : '+'}
                </button>
                <div className="order-item-qty">
                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={it.quantity}
                    onChange={(e) => updateItem(i, { quantity: e.target.value })}
                  />
                  <select value={it.unit} onChange={(e) => updateItem(i, { unit: e.target.value })}>
                    {ITEM_UNITS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  className="order-item-amount"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={maskAmount(it.amount)}
                  onChange={(e) => updateItem(i, { amount: unmaskAmount(e.target.value) })}
                />
                <div className="item-menu">
                  <button
                    type="button"
                    className="item-menu-btn"
                    aria-label="Item actions"
                    onClick={() => setOpenItemMenu(openItemMenu === i ? null : i)}
                  >
                    ⋯
                  </button>
                  {openItemMenu === i && (
                    <ul className="item-menu-dropdown">
                      <li>
                        <button
                          type="button"
                          onClick={() => {
                            toggleField(i, 'discount')
                            setOpenItemMenu(null)
                          }}
                        >
                          Set discount
                        </button>
                      </li>
                      <li>
                        <button
                          type="button"
                          onClick={() => {
                            toggleField(i, 'tax')
                            setOpenItemMenu(null)
                          }}
                        >
                          Set tax
                        </button>
                      </li>
                      <li>
                        <button
                          type="button"
                          onClick={() => saveAsService(i)}
                        >
                          Save as Service
                        </button>
                      </li>
                      <li>
                        <button
                          type="button"
                          onClick={() => {
                            duplicateItem(i)
                            setOpenItemMenu(null)
                          }}
                        >
                          Duplicate
                        </button>
                      </li>
                      <li>
                        <button
                          type="button"
                          onClick={() => {
                            removeItem(i)
                            setOpenItemMenu(null)
                          }}
                        >
                          Remove
                        </button>
                      </li>
                    </ul>
                  )}
                </div>
                {isOpen(i, 'desc') && (
                  <textarea
                    className="order-item-desc"
                    placeholder="Description"
                    rows={2}
                    value={it.description}
                    onChange={(e) => updateItem(i, { description: e.target.value })}
                  />
                )}
                {isOpen(i, 'discount') && (
                  <div className="order-item-panel">
                    <span className="field-label">Discount</span>
                    <div className="order-item-panel-control">
                      <input
                        inputMode="decimal"
                        placeholder="0"
                        value={it.discount}
                        onChange={(e) => updateItem(i, { discount: e.target.value })}
                      />
                      <span className="order-item-suffix">%</span>
                    </div>
                  </div>
                )}
                {isOpen(i, 'tax') && (
                  <div className="order-item-panel">
                    <span className="field-label">Tax</span>
                    <div className="order-item-panel-control">
                      <input
                        inputMode="decimal"
                        placeholder="0"
                        value={it.tax}
                        onChange={(e) => updateItem(i, { tax: e.target.value })}
                      />
                      <span className="order-item-suffix">%</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <button type="button" className="btn-secondary btn-sm" onClick={addItem}>
              + Add item
            </button>
          </div>
        </div>
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
                  autoComplete="new-password"
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
                      Unit
                      <input value={addressForm.unit} onChange={(e) => setAddressForm((f) => ({ ...f, unit: e.target.value }))} placeholder="Unit" />
                    </label>
                    <label>
                      Zip
                      <input value={addressForm.zip} onChange={(e) => setAddressForm((f) => ({ ...f, zip: e.target.value }))} placeholder="10115" />
                    </label>
                  </div>
                </div>
              )}
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={addressForm.is_default}
                  disabled={addresses.length === 0}
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
                        onClick={() => chooseAddress(a)}
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
        {editDialog && user && (
          <div className="modal-overlay" onClick={() => !editSaving && setEditDialog(false)}>
            <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submitEdit}>
              <h3>Edit customer</h3>
              <p className="muted modal-subtitle">
                {`${user.first_name || user.username} ${user.last_name}`.trim()} (@{user.username})
              </p>
              <div className="form-grid">
                <label>
                  First name
                  <input value={editForm.first_name} onChange={(e) => setEditForm((f) => ({ ...f, first_name: e.target.value }))} />
                </label>
                <label>
                  Last name
                  <input value={editForm.last_name} onChange={(e) => setEditForm((f) => ({ ...f, last_name: e.target.value }))} />
                </label>
              </div>
              {editError && <div className="alert form-alert">{editError}</div>}
              <div className="form-actions">
                <button type="submit" disabled={editSaving}>
                  {editSaving ? 'Saving…' : 'Save changes'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setEditDialog(false)} disabled={editSaving}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
        {formError && <div className="alert form-alert">{formError}</div>}
        <div className="form-actions">
          <button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Create order'}
          </button>
          <Link to={`${base}/orders`} className="btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </>
  )
}