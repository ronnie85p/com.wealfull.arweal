import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import Breadcrumbs from '../components/Breadcrumbs'

export default function EditMaterial() {
  const navigate = useNavigate()
  const { id } = useParams()
  const materialId = Number(id)

  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!materialId) {
      setError('Material not found.')
      return
    }
    api
      .material(materialId)
      .then((m) => setName(m.name))
      .catch((e) => setError(e.message))
  }, [materialId])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setFormError('Name is required.')
      return
    }
    setFormError('')
    setSaving(true)
    try {
      await api.updateMaterial(materialId, { name: name.trim() })
      navigate('/app/materials')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update material')
      setSaving(false)
    }
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Dashboard', to: '/app' },
          { label: 'Materials', to: '/app/materials' },
        ]}
      />
      <h1>Edit material</h1>
      <p className="page-subtitle">Update the material details.</p>

      {error && <div className="alert">{error}</div>}
      {!error && (
        <form className="panel form-grid" onSubmit={onSubmit}>
          <label>
            Name *
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Concrete mix"
              required
            />
          </label>
          {formError && <div className="alert form-alert">{formError}</div>}
          <div className="form-actions">
            <button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <Link to="/app/materials" className="btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      )}
    </>
  )
}
