import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, Category, Service } from '../api'
import Breadcrumbs from '../components/Breadcrumbs'
import TagInput from '../components/TagInput'
import { useAccountContext } from '../components/AccountContext'
import { useAccountBase } from '../lib/account'

const money = (s: Service) =>
  Number(s.price).toLocaleString('en-US', { style: 'currency', currency: s.currency })

export default function CategoryDetail() {
  const { id } = useParams()
  const categoryId = Number(id)
  const base = useAccountBase()
  const { account } = useAccountContext()
  const accountId = account?.uuid ?? ''
  const navigate = useNavigate()

  const [item, setItem] = useState<Category | null>(null)
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [error, setError] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [name, setName] = useState('')
  const [fullName, setFullName] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [initial, setInitial] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [editError, setEditError] = useState('')

  useEffect(() => {
    if (!categoryId) {
      setError('Category not found.')
      return
    }
    api
      .category(categoryId, accountId)
      .then(setItem)
      .catch((e) => setError(e.message))
  }, [categoryId, accountId])

  useEffect(() => {
    api.categories(undefined, accountId).then(setAllCategories).catch(() => undefined)
  }, [accountId])
  useEffect(() => {
    api.services(accountId).then(setServices).catch(() => undefined)
  }, [accountId])

  const categoryServices = services.filter((s) => s.category_id === categoryId)

  const nameExists =
    !!name.trim() &&
    allCategories.some(
      (c) => c.id !== categoryId && c.name.toLowerCase() === name.trim().toLowerCase(),
    )

  const dirty = initial !== null && [name, fullName, description, tags.join(', ')].join('\u0000') !== initial

  function openEdit() {
    if (!item) return
    setName(item.name)
    setFullName(item.full_name)
    setDescription(item.description)
    setTags(item.tags.split(',').map((t) => t.trim()).filter(Boolean))
    setInitial([item.name, item.full_name, item.description, item.tags].join('\u0000'))
    setEditError('')
    setEditOpen(true)
  }

  async function onSave(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || busy || nameExists) return
    setBusy(true)
    setEditError('')
    try {
      await api.updateCategory(categoryId, name.trim(), fullName.trim(), description.trim(), tags.join(', '), accountId)
      setEditOpen(false)
      const updated = await api.category(categoryId, accountId)
      setItem(updated)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to save category')
    } finally {
      setBusy(false)
    }
  }

  async function onDelete() {
    if (!item || busy) return
    setBusy(true)
    setError('')
    try {
      await api.deleteCategory(item.id, accountId)
      navigate(`${base}/categories`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category')
      setBusy(false)
    }
  }

  const tagList = item ? item.tags.split(',').map((t) => t.trim()).filter(Boolean) : []

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Dashboard', to: `${base}` },
          { label: 'Categories', to: `${base}/categories` },
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
                {item.full_name && <span className="muted subtitle-location">{item.full_name}</span>}
                {item.description && <span className="muted subtitle-location">{item.description}</span>}
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
                  <span className="muted">Name</span>
                  {item.name}
                </span>
                {item.full_name && (
                  <span className="place-info-cell">
                    <span className="muted">Full name</span>
                    {item.full_name}
                  </span>
                )}
                <span className="place-info-cell">
                  <span className="muted">Created</span>
                  {new Date(item.created_at).toLocaleString()}
                </span>
              </div>
            </div>
            {tagList.length > 0 && (
              <div className="place-info detail-extra">
                <div className="place-info-row tags-row">
                  <span className="muted">Tags:</span>
                  <strong>
                    {tagList.map((t) => (
                      <span key={t} className="tag">
                        {t}
                      </span>
                    ))}
                  </strong>
                </div>
              </div>
            )}
          </div>

          <div className="panel">
            <h2>Services</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {categoryServices.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link to={`${base}/services/${s.id}`} className="location-link">
                        <strong>{s.name}</strong>
                      </Link>
                    </td>
                    <td>{money(s)}</td>
                    <td>
                      <span className={`badge badge-${s.status}`}>{s.status_display}</span>
                    </td>
                    <td>{new Date(s.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {categoryServices.length === 0 && (
                  <tr>
                    <td colSpan={4} className="empty">
                      No services in this category yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editOpen && item && (
        <div className="modal-overlay">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Edit category</h3>
            <form className="modal-form" onSubmit={onSave}>
              <label className="field-label">
                Name
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Category name"
                />
                {nameExists && (
                  <span className="field-error">A category with this name already exists.</span>
                )}
              </label>
              <label className="field-label">
                Full name
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full category name"
                />
              </label>
              <label className="field-label">
                Description
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this category for?"
                />
              </label>
              <label className="field-label">
                Tags
                <TagInput value={tags} onChange={setTags} />
              </label>
              {editError && <div className="alert form-alert">{editError}</div>}
              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setEditOpen(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn primary"
                  disabled={busy || !name.trim() || nameExists || !dirty}
                >
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
