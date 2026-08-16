import { FormEvent, useState } from 'react'
import { api, Category } from '../api'
import TagInput from './TagInput'

interface CategoryFormModalProps {
  categories: Category[]
  onClose: () => void
  onCreated: (category: Category) => void
}

export default function CategoryFormModal({
  categories,
  onClose,
  onCreated,
}: CategoryFormModalProps) {
  const [name, setName] = useState('')
  const [fullName, setFullName] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const nameExists =
    !!name.trim() && categories.some((c) => c.name.toLowerCase() === name.trim().toLowerCase())

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || busy || nameExists) return
    setBusy(true)
    setError('')
    try {
      const category = await api.createCategory(
        name.trim(),
        fullName.trim(),
        description.trim(),
        tags.join(', '),
      )
      onCreated(category)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>New category</h3>
        <form className="modal-form" onSubmit={onSubmit}>
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
          {error && <div className="alert">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={busy || !name.trim() || nameExists}>
              {busy ? 'Saving…' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}