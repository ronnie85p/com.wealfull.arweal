import { FormEvent, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api, Category, Location, Service } from '../api'
import CategoryAutocomplete from '../components/CategoryAutocomplete'
import CategoryFormModal from '../components/CategoryFormModal'
import LocationAutocomplete, { LocationPick } from '../components/LocationAutocomplete'
import LocationFormModal from '../components/LocationFormModal'
import MoneyInput from '../components/MoneyInput'
import RichEditor from '../components/RichEditor'
import TagInput from '../components/TagInput'
import { useAccountContext } from '../components/AccountContext'
import { useAccountBase } from '../lib/account'

const money = (s: Service) =>
  Number(s.price).toLocaleString('en-US', { style: 'currency', currency: s.currency })

interface ServiceForm {
  name: string
  shortDescription: string
  description: string
  features: string[]
  tags: string[]
  price: string
  oldPrice: string
  durationStart: string
  durationEnd: string
  durationUnit: string
  currency: string
  status: string
  categoryId: string
  locations: LocationPick[]
}

const emptyForm: ServiceForm = {
  name: '',
  shortDescription: '',
  description: '',
  features: [],
  tags: [],
  price: '',
  oldPrice: '',
  durationStart: '',
  durationEnd: '',
  durationUnit: 'days',
  currency: 'EUR',
  status: 'active',
  categoryId: '',
  locations: [],
}

function parseMoney(raw: string): number | null {
  const cleaned = raw.replace(/,/g, '')
  if (!/^\d*\.?\d*$/.test(cleaned)) return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

export default function Services() {
  const location = useLocation()
  const base = useAccountBase()
  const { account } = useAccountContext()
  const [items, setItems] = useState<Service[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<ServiceForm>(emptyForm)
  const [initialForm, setInitialForm] = useState<ServiceForm | null>(null)
  const [initialCategoryId, setInitialCategoryId] = useState('')
  const [initialCategoryLabel, setInitialCategoryLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [addCategoryOpen, setAddCategoryOpen] = useState(false)
  const [addLocationOpen, setAddLocationOpen] = useState(false)
  const [categoryFocus, setCategoryFocus] = useState(0)
  const [locationFocus, setLocationFocus] = useState(0)

  function load() {
    api.services().then(setItems).catch((e) => setError(e.message))
  }

  useEffect(load, [])
  useEffect(() => {
    api.categories().then(setCategories).catch(() => undefined)
  }, [])
  useEffect(() => {
    api.locations().then(setLocations).catch(() => undefined)
  }, [])

  useEffect(() => {
    if ((location.state as { openNew?: boolean } | null)?.openNew) {
      openModal()
      window.history.replaceState({}, '')
    }
  }, [location.state])

  const dirty = initialForm !== null && JSON.stringify(form) !== JSON.stringify(initialForm)

  const selectedCategoryId = form.categoryId ? Number(form.categoryId) : null
  const nameExists =
    !!form.name.trim() &&
    selectedCategoryId !== null &&
    items.some(
      (s) =>
        s.id !== editingId &&
        s.category_id === selectedCategoryId &&
        s.name.trim().toLowerCase() === form.name.trim().toLowerCase(),
    )

  function set<K extends keyof ServiceForm>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function openModal(s?: Service) {
    setEditingId(s ? s.id : null)
    const next = s
      ? {
          name: s.name,
          shortDescription: s.short_description,
          description: s.description,
          features: s.features.split(',').map((t) => t.trim()).filter(Boolean),
          tags: s.tags.split(',').map((t) => t.trim()).filter(Boolean),
          price: s.price,
          oldPrice: s.old_price,            durationStart: s.duration_start ? String(s.duration_start) : '',
          durationEnd: s.duration_end ? String(s.duration_end) : '',
          durationUnit: s.duration_unit,
          currency: s.currency,
          status: s.status,
          categoryId: s.category_id ? String(s.category_id) : '',
          locations: (s.location_links ?? []).map((l) => ({
            id: l.location_id,
            label: l.location_name,
          })),
        }
      : { ...emptyForm }
    setForm(next)
    setInitialForm(next)
    const cat = s ? categories.find((c) => c.id === s.category_id) : undefined
    setInitialCategoryId(cat ? String(cat.id) : '')
    setInitialCategoryLabel(cat ? cat.name : '')
    setFormError('')
    setCategoryFocus(0)
    setLocationFocus(0)
    setModalOpen(true)
  }

  async function onSave(e: FormEvent) {
    e.preventDefault()
    const price = parseMoney(form.price)
    const oldPrice = form.oldPrice ? parseMoney(form.oldPrice) : null
    if (!form.name.trim()) {
      setFormError('Name is required.')
      return
    }
    if (price === null || price <= 0) {
      setFormError('Enter a valid price greater than 0.')
      return
    }
    if (oldPrice === null && form.oldPrice.trim()) {
      setFormError('Old price is invalid.')
      return
    }
    if (nameExists) {
      setFormError('A service with this name already exists in the selected category.')
      return
    }
    if (
      form.durationStart &&
      form.durationEnd &&
      Number(form.durationStart) > Number(form.durationEnd)
    ) {
      setFormError('Duration start cannot exceed duration end.')
      return
    }
    setFormError('')
    setBusy(true)
    try {
      const payload = {
        account_id: account?.uuid ?? null,
        name: form.name.trim(),
        short_description: form.shortDescription.trim(),
        description: form.description.trim(),
        features: form.features.join(', '),
        tags: form.tags.join(', '),
        price: String(price),
        old_price: oldPrice === null ? '0' : String(oldPrice),
        duration_start: form.durationStart ? Number(form.durationStart) : 0,
        duration_end: form.durationEnd ? Number(form.durationEnd) : 0,
        duration_unit: form.durationUnit,
        currency: form.currency,
        status: form.status,
        category_id: form.categoryId ? Number(form.categoryId) : null,
        service_locations: form.locations.map((l) => ({ location_id: l.id })),
      }
      if (editingId) {
        await api.updateService(editingId, payload)
      } else {
        const created = await api.createService(payload)
        const linkLocationId = (location.state as { locationId?: number } | null)?.locationId
        if (linkLocationId) {
          const loc = await api.location(linkLocationId)
          await api.updateLocation(linkLocationId, {
            location_services: [
              ...loc.service_links.map((l) => ({ service_id: l.service_id })),
              { service_id: created.id },
            ],
          })
        }
      }
      setModalOpen(false)
      load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save service')
    } finally {
      setBusy(false)
    }
  }

  async function remove(s: Service) {
    try {
      await api.deleteService(s.id)
      setItems((prev) => prev.map((x) => (x.id === s.id ? { ...x, deleted: true } : x)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete service')
    }
  }

  async function restore(s: Service) {
    try {
      await api.restoreService(s.id)
      setItems((prev) => prev.map((x) => (x.id === s.id ? { ...x, deleted: false } : x)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore service')
    }
  }

  function dismissDeleted(s: Service) {
    setItems((prev) => prev.filter((x) => x.id !== s.id))
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Services</h1>
          <p className="page-subtitle no-margin">Your service catalog.</p>
        </div>
        <div className="page-head-actions">
          <button type="button" className="button" onClick={() => openModal()}>
            Add Service
          </button>
        </div>
      </div>
      {error && <div className="alert">{error}</div>}

      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Price</th>
              <th>Status</th>
              <th>Created</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((s) =>
              s.deleted ? (
                <tr key={s.id} className="deleted-row">
                  <td colSpan={6}>
                    <div className="deleted-inline">
                      <span>
                        <strong>{s.name}</strong> deleted.
                      </span>
                      <span className="row-actions">
                        <button type="button" className="btn-sm" onClick={() => restore(s)}>
                          Undo
                        </button>
                        <button type="button" className="btn-sm" onClick={() => dismissDeleted(s)}>
                          Dismiss
                        </button>
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={s.id}>
                  <td>
                    <Link to={`${base}/services/${s.id}`} className="location-link">
                      <strong>{s.name}</strong>
                    </Link>
                  </td>
                  <td>
                    <span dangerouslySetInnerHTML={{ __html: s.description }} />
                  </td>
                  <td>{money(s)}</td>
                  <td>
                    <span className={`badge badge-${s.status}`}>{s.status_display}</span>
                  </td>
                  <td>{new Date(s.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className="btn-sm" onClick={() => openModal(s)}>
                        Edit
                      </button>
                      <button type="button" className="btn-danger btn-sm" onClick={() => remove(s)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ),
            )}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">
                  No services.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingId ? 'Edit service' : 'New service'}</h3>
            <form className="modal-form" onSubmit={onSave}>
              <div className="field-label">
                <span className="field-label-row">
                  <span>Category</span>
                  <button
                    type="button"
                    className="field-add-link"
                    onClick={() => {
                      setModalOpen(false)
                      setAddCategoryOpen(true)
                    }}
                  >
                    Add
                  </button>
                </span>
                <CategoryAutocomplete
                  onChange={(id) => set('categoryId', id)}
                  categories={categories}
                  initialId={initialCategoryId}
                  initialLabel={initialCategoryLabel}
                  focusSignal={categoryFocus}
                  onFocusApplied={() => setCategoryFocus(0)}
                />
              </div>
              <label className="field-label">
                Name
                <input
                  type="text"
                  className={nameExists ? 'input-error' : undefined}
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="e.g. Website development"
                />
                {nameExists && (
                  <span className="field-error">
                    A service with this name already exists in the selected category.
                  </span>
                )}
              </label>
              <label className="field-label">
                Short description
                <textarea
                  rows={2}
                  value={form.shortDescription}
                  onChange={(e) => set('shortDescription', e.target.value)}
                  placeholder="Short summary shown in lists"
                />
              </label>
              <label className="field-label">
                Description
                <RichEditor
                  value={form.description}
                  onChange={(html) => set('description', html)}
                  placeholder="What does this service include?"
                  rows={8}
                />
              </label>
              <label className="field-label">
                Features
                <TagInput value={form.features} onChange={(v) => set('features', v as never)} />
              </label>
              <label className="field-label">
                Tags
                <TagInput value={form.tags} onChange={(v) => set('tags', v as never)} />
              </label>
              <div className="form-row">
                <label className="field-label">
                  Price
                  <MoneyInput value={form.price} onChange={(v) => set('price', v)} />
                </label>
                <label className="field-label">
                  Old price
                  <MoneyInput value={form.oldPrice} onChange={(v) => set('oldPrice', v)} />
                </label>
              </div>
              <label className="field-label project-field-duration">
Work duration
                <span className="duration-row">
                  <input
                    type="number"
                    min="0"
                    max={form.durationEnd ? Number(form.durationEnd) : undefined}
                    placeholder="From"
                    value={form.durationStart}
                    onChange={(e) => set('durationStart', e.target.value)}
                  />
                  <span className="muted">–</span>
                  <input
                    type="number"
                    min={form.durationStart ? Number(form.durationStart) : 0}
                    placeholder="To"
                    value={form.durationEnd}
                    onChange={(e) => set('durationEnd', e.target.value)}
                  />
                  <select
                    value={form.durationUnit}
                    onChange={(e) => set('durationUnit', e.target.value)}
                  >
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                  </select>
                </span>
              </label>
              <div className="field-label">
                <span className="field-label-row">
                  <span>Locations</span>
                  <button
                    type="button"
                    className="field-add-link"
                    onClick={() => {
                      setModalOpen(false)
                      setAddLocationOpen(true)
                    }}
                  >
                    Add
                  </button>
                </span>
                <LocationAutocomplete
                  value={form.locations}
                  onChange={(v) => setForm((f) => ({ ...f, locations: v }))}
                  locations={locations}
                  focusSignal={locationFocus}
                  onFocusApplied={() => setLocationFocus(0)}
                />
              </div>
              {formError && <div className="alert form-alert">{formError}</div>}
              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn primary"
                  disabled={busy || !form.name.trim() || !dirty}
                >
                  {busy ? 'Saving…' : editingId ? 'Save' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {addCategoryOpen && (
        <CategoryFormModal
          categories={categories}
          onClose={() => {
            setAddCategoryOpen(false)
            setCategoryFocus((f) => f + 1)
            setModalOpen(true)
          }}
          onCreated={(c) => {
            setCategories((prev) => [...prev, c])
            setForm((f) => ({ ...f, categoryId: String(c.id) }))
            setInitialCategoryId(String(c.id))
            setInitialCategoryLabel(c.name)
            setAddCategoryOpen(false)
            setCategoryFocus((f) => f + 1)
            setModalOpen(true)
          }}
        />
      )}

      {addLocationOpen && (
        <LocationFormModal
          onClose={() => {
            setAddLocationOpen(false)
            setLocationFocus((f) => f + 1)
            setModalOpen(true)
          }}
          onCreated={(l) => {
            setLocations((prev) => [...prev, l])
            setForm((f) => ({
              ...f,
              locations: [...f.locations, { id: l.id, label: l.full_location || l.location }],
            }))
            setAddLocationOpen(false)
            setLocationFocus((f) => f + 1)
            setModalOpen(true)
          }}
        />
      )}
    </>
  )
}
