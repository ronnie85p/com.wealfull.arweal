import { FormEvent, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api, Category } from '../api'
import TagInput from '../components/TagInput'
import { useAccountContext } from '../components/AccountContext'
import { useAccountBase } from '../lib/account'

export default function Categories() {
  const location = useLocation()
  const base = useAccountBase()
  const { account } = useAccountContext()
  const [items, setItems] = useState<Category[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [fullName, setFullName] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function load() {
    api.categories().then(setItems).catch((e) => setError(e.message))
  }

  useEffect(load, [])

  useEffect(() => {
    if ((location.state as { openNew?: boolean } | null)?.openNew) {
      openModal()
      window.history.replaceState({}, '')
    }
  }, [location.state])

  function openModal(c?: Category) {
    setEditingId(c ? c.id : null)
    setName(c ? c.name : '')
    setFullName(c ? c.full_name : '')
    setDescription(c ? c.description : '')
    setTags(c ? c.tags.split(',').map((t) => t.trim()).filter(Boolean) : [])
    setError('')
    setModalOpen(true)
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      const payload = [
        name.trim(),
        fullName.trim(),
        description.trim(),
        tags.join(', '),
      ] as const
      if (editingId) await api.updateCategory(editingId, ...payload, account?.uuid ?? null)
      else await api.createCategory(...payload, account?.uuid ?? null)
      setModalOpen(false)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save category')
    } finally {
      setBusy(false)
    }
  }

  async function remove(c: Category) {
    if (!window.confirm(`Delete category "${c.name}"?`)) return
    try {
      await api.deleteCategory(c.id)
      setItems((prev) => prev.filter((x) => x.id !== c.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category')
    }
  }

  const nameExists =
    !!name.trim() &&
    items.some(
      (c) => c.id !== editingId && c.name.toLowerCase() === name.trim().toLowerCase(),
    )

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Categories</h1>
          <p className="page-subtitle no-margin">Group your services by category.</p>
        </div>
        <div className="page-head-actions">
          <button type="button" className="button" onClick={() => openModal()}>
            Add Category
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
              <th>Created</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link to={`${base}/categories/${c.id}`} className="location-link">
                    <strong>{c.name}</strong>
                  </Link>
                </td>
                <td>{c.description}</td>
                <td>{new Date(c.created_at).toLocaleDateString()}</td>
                <td>
                  <div className="row-actions">
                    <button type="button" className="btn-sm" onClick={() => openModal(c)}>
                      Edit
                    </button>
                    <button type="button" className="btn-danger btn-sm" onClick={() => remove(c)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="empty">
                  No categories yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingId ? 'Edit category' : 'New category'}</h3>
            <form className="modal-form" onSubmit={onCreate}>
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
              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn primary"
                  disabled={busy || !name.trim() || nameExists}
                >
                  {busy ? 'Saving…' : editingId ? 'Save' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
