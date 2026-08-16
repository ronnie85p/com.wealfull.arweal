import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, Category, Location, Service } from '../api'
import Breadcrumbs from '../components/Breadcrumbs'
import CategoryAutocomplete from '../components/CategoryAutocomplete'
import LocationAutocomplete, { LocationPick } from '../components/LocationAutocomplete'
import MoneyInput from '../components/MoneyInput'
import RichEditor from '../components/RichEditor'
import TagInput from '../components/TagInput'
import { useAccountBase } from '../lib/account'

const money = (s: Service) =>
  Number(s.price).toLocaleString('en-US', { style: 'currency', currency: s.currency })

const statusLabel = (s: Service) => s.status_display || s.status

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

function parseMoney(raw: string): number | null {
  const cleaned = raw.replace(/,/g, '')
  if (!/^\d*\.?\d*$/.test(cleaned)) return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

export default function ServiceDetail() {
  const { id } = useParams()
  const serviceId = Number(id)
  const base = useAccountBase()
  const navigate = useNavigate()

  const [item, setItem] = useState<Service | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [error, setError] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState<ServiceForm | null>(null)
  const [initialForm, setInitialForm] = useState<ServiceForm | null>(null)
  const [initialCategoryId, setInitialCategoryId] = useState('')
  const [initialCategoryLabel, setInitialCategoryLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (!serviceId) {
      setError('Service not found.')
      return
    }
    api
      .service(serviceId)
      .then(setItem)
      .catch((e) => setError(e.message))
  }, [serviceId])

  useEffect(() => {
    api.categories().then(setCategories).catch(() => undefined)
  }, [])
  useEffect(() => {
    api.locations().then(setLocations).catch(() => undefined)
  }, [])
  useEffect(() => {
    api.services().then(setServices).catch(() => undefined)
  }, [])

  const category = item ? categories.find((c) => c.id === item.category_id) : undefined

  const dirty = initialForm !== null && form !== null && JSON.stringify(form) !== JSON.stringify(initialForm)

  const selectedCategoryId = form?.categoryId ? Number(form.categoryId) : null
  const nameExists =
    !!form?.name.trim() &&
    selectedCategoryId !== null &&
    services.some(
      (s) =>
        s.id !== serviceId &&
        s.category_id === selectedCategoryId &&
        s.name.trim().toLowerCase() === form!.name.trim().toLowerCase(),
    )

  function openEdit() {
    if (!item) return
    const next: ServiceForm = {
      name: item.name,
      shortDescription: item.short_description,
      description: item.description,
      features: item.features.split(',').map((t) => t.trim()).filter(Boolean),
      tags: item.tags.split(',').map((t) => t.trim()).filter(Boolean),
      price: item.price,
      oldPrice: item.old_price,
      durationStart: item.duration_start ? String(item.duration_start) : '',
      durationEnd: item.duration_end ? String(item.duration_end) : '',
      durationUnit: item.duration_unit,
      currency: item.currency,
      status: item.status,
      categoryId: item.category_id ? String(item.category_id) : '',
      locations: (item.location_links ?? []).map((l) => ({
        id: l.location_id,
        label: l.location_name,
      })),
    }
    setForm(next)
    setInitialForm(next)
    const cat = categories.find((c) => c.id === item.category_id)
    setInitialCategoryId(cat ? String(cat.id) : '')
    setInitialCategoryLabel(cat ? cat.name : '')
    setFormError('')
    setEditOpen(true)
  }

  async function onSave(e: FormEvent) {
    e.preventDefault()
    if (!form || busy) return
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
    if (form.durationStart && form.durationEnd && Number(form.durationStart) > Number(form.durationEnd)) {
      setFormError('Duration start cannot exceed duration end.')
      return
    }
    setFormError('')
    setBusy(true)
    try {
      const payload = {
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
      await api.updateService(serviceId, payload)
      setEditOpen(false)
      const updated = await api.service(serviceId)
      setItem(updated)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save service')
    } finally {
      setBusy(false)
    }
  }

  async function onDelete() {
    if (!item || busy) return
    setBusy(true)
    setError('')
    try {
      await api.deleteService(item.id)
      navigate(`${base}/services`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete service')
      setBusy(false)
    }
  }

  const durationText = (() => {
    if (!item) return '—'
    const parts: string[] = []
    if (item.duration_start) parts.push(String(item.duration_start))
    if (item.duration_end) parts.push(String(item.duration_end))
    if (!parts.length) return '—'
    const unit =
      item.duration_unit === 'weeks' ? (Number(parts[0]) === 1 ? 'week' : 'weeks')
      : item.duration_unit === 'months' ? (Number(parts[0]) === 1 ? 'month' : 'months')
      : Number(parts[0]) === 1 ? 'day'
      : 'days'
    return `${parts.join('–')} ${unit}`
  })()

  const tags = item ? item.tags.split(',').map((t) => t.trim()).filter(Boolean) : []
  const features = item ? item.features.split(',').map((t) => t.trim()).filter(Boolean) : []

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Dashboard', to: `${base}` },
          { label: 'Services', to: `${base}/services` },
          { label: item ? item.name : '…' },
        ]}
      />
      {error && <div className="alert">{error}</div>}
      {item && (
        <>
          <div className="page-head">
            <div>
              <h1>{item.name}</h1>
              <p className="page-subtitle no-margin location-subtitle">
                <span className={`badge badge-${item.status}`}>{statusLabel(item)}</span>
                {category && <span className="tag">{category.name}</span>}
                {item.short_description && (
                  <span className="muted subtitle-location">{item.short_description}</span>
                )}
              </p>
            </div>
            <div className="page-head-actions">
              <button type="button" className="btn" onClick={openEdit}>
                Edit
              </button>
              <button type="button" className="btn-danger" onClick={onDelete}>
                Delete
              </button>
            </div>
          </div>

          <div className="panel">
            <div className="place-info detail-extra">
              <div className="place-info-grid">
                <span className="place-info-cell">
                  <span className="muted">Price</span>
                  {money(item)}
                </span>
                {Number(item.old_price) > 0 && (
                  <span className="place-info-cell">
                    <span className="muted">Old price</span>
                    <span style={{ textDecoration: 'line-through' }}>
                      {Number(item.old_price).toLocaleString('en-US', {
                        style: 'currency',
                        currency: item.currency,
                      })}
                    </span>
                  </span>
                )}
                <span className="place-info-cell">
                  <span className="muted">Duration</span>
                  {durationText}
                </span>
                <span className="place-info-cell">
                  <span className="muted">Status</span>
                  {statusLabel(item)}
                </span>
                <span className="place-info-cell">
                  <span className="muted">Created</span>
                  {new Date(item.created_at).toLocaleString()}
                </span>
              </div>
            </div>
            {item.description && (
              <div className="place-info detail-extra">
                <div className="description-box" dangerouslySetInnerHTML={{ __html: item.description }} />
              </div>
            )}
            {features.length > 0 && (
              <div className="place-info detail-extra">
                <div className="place-info-row tags-row">
                  <span className="muted">Features:</span>
                  <strong>
                    {features.map((f) => (
                      <span key={f} className="tag">
                        {f}
                      </span>
                    ))}
                  </strong>
                </div>
              </div>
            )}
            {tags.length > 0 && (
              <div className="place-info detail-extra">
                <div className="place-info-row tags-row">
                  <span className="muted">Tags:</span>
                  <strong>
                    {tags.map((t) => (
                      <span key={t} className="tag">
                        {t}
                      </span>
                    ))}
                  </strong>
                </div>
              </div>
            )}
            {item.images.length > 0 && (
              <div className="service-images">
                {item.images.map((img) => (
                  <img key={img.id} src={img.url} alt={item.name} />
                ))}
              </div>
            )}
          </div>

          <div className="panel">
            <h2>Locations</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>
                {item.location_links.map((l) => (
                  <tr key={l.location_id}>
                    <td>
                      <Link to={`${base}/locations/${l.location_id}`} className="location-link">
                        {l.location_name}
                      </Link>
                    </td>
                  </tr>
                ))}
                {item.location_links.length === 0 && (
                  <tr>
                    <td className="empty">No locations yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editOpen && item && form && (
        <div className="modal-overlay">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Edit service</h3>
            <form className="modal-form" onSubmit={onSave}>
              <div className="field-label">
                <span className="field-label-row">
                  <span>Category</span>
                </span>
                <CategoryAutocomplete
                  onChange={(id) => setForm((f) => (f ? { ...f, categoryId: id } : f))}
                  categories={categories}
                  initialId={initialCategoryId}
                  initialLabel={initialCategoryLabel}
                />
              </div>
              <label className="field-label">
                Name
                <input
                  type="text"
                  className={nameExists ? 'input-error' : undefined}
                  value={form.name}
                  onChange={(e) => setForm((f) => (f ? { ...f, name: e.target.value } : f))}
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
                  onChange={(e) => setForm((f) => (f ? { ...f, shortDescription: e.target.value } : f))}
                  placeholder="Short summary shown in lists"
                />
              </label>
              <label className="field-label">
                Description
                <RichEditor
                  value={form.description}
                  onChange={(html) => setForm((f) => (f ? { ...f, description: html } : f))}
                  placeholder="What does this service include?"
                  rows={8}
                />
              </label>
              <label className="field-label">
                Features
                <TagInput
                  value={form.features}
                  onChange={(v) => setForm((f) => (f ? { ...f, features: v as never } : f))}
                />
              </label>
              <label className="field-label">
                Tags
                <TagInput
                  value={form.tags}
                  onChange={(v) => setForm((f) => (f ? { ...f, tags: v as never } : f))}
                />
              </label>
              <div className="form-row">
                <label className="field-label">
                  Price
                  <MoneyInput
                    value={form.price}
                    onChange={(v) => setForm((f) => (f ? { ...f, price: v } : f))}
                  />
                </label>
                <label className="field-label">
                  Old price
                  <MoneyInput
                    value={form.oldPrice}
                    onChange={(v) => setForm((f) => (f ? { ...f, oldPrice: v } : f))}
                  />
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
                    onChange={(e) => setForm((f) => (f ? { ...f, durationStart: e.target.value } : f))}
                  />
                  <span className="muted">–</span>
                  <input
                    type="number"
                    min={form.durationStart ? Number(form.durationStart) : 0}
                    placeholder="To"
                    value={form.durationEnd}
                    onChange={(e) => setForm((f) => (f ? { ...f, durationEnd: e.target.value } : f))}
                  />
                  <select
                    value={form.durationUnit}
                    onChange={(e) => setForm((f) => (f ? { ...f, durationUnit: e.target.value } : f))}
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
                </span>
                <LocationAutocomplete
                  value={form.locations}
                  onChange={(v) => setForm((f) => (f ? { ...f, locations: v } : f))}
                  locations={locations}
                />
              </div>
              {formError && <div className="alert form-alert">{formError}</div>}
              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setEditOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn primary" disabled={busy || !form.name.trim() || !dirty}>
                  {busy ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
