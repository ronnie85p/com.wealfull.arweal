import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import Breadcrumbs from '../components/Breadcrumbs'
import { useAccountBase } from '../lib/account'

export default function CreateMaterial() {
  const navigate = useNavigate()
  const base = useAccountBase()
  const [name, setName] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setFormError('Name is required.')
      return
    }
    setFormError('')
    setSaving(true)
    try {
      await api.createMaterial({ name: name.trim() })
      navigate(`${base}/materials`)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create material')
      setSaving(false)
    }
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Dashboard', to: `${base}` },
          { label: 'Materials', to: `${base}/materials` },
        ]}
      />
      <h1>New material</h1>
      <p className="page-subtitle">Add a material to your catalog.</p>

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
            {saving ? 'Saving…' : 'Create material'}
          </button>
          <Link to={`${base}/materials`} className="btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </>
  )
}