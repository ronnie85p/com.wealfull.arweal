import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import Breadcrumbs from '../components/Breadcrumbs'
import { useAccountBase } from '../lib/account'

const DURATION_UNITS = [
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'months', label: 'Months' },
]

const emptyForm = {
  name: '',
  start_time: '',
  duration: '',
  duration_to: '',
  duration_unit: 'days',
}

export default function EditProject() {
  const navigate = useNavigate()
  const base = useAccountBase()
  const { id } = useParams()
  const projectId = Number(id)

  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!projectId) {
      setError('Project not found.')
      return
    }
    api
      .project(projectId)
      .then((p) =>
        setForm({
          name: p.name,
          start_time: p.start_time ? new Date(p.start_time).toISOString().slice(0, 16) : '',
          duration: String(p.duration),
          duration_to: String(p.duration_to),
          duration_unit: p.duration_unit,
        }),
      )
      .catch((e) => setError(e.message))
  }, [projectId])

  function set<K extends keyof typeof emptyForm>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      setFormError('Name is required.')
      return
    }
    setFormError('')
    setSaving(true)
    try {
      await api.updateProject(projectId, {
        name: form.name.trim(),
        start_time: form.start_time || null,
        duration: Number(form.duration) || 0,
        duration_to: Number(form.duration_to) || 0,
        duration_unit: form.duration_unit,
      })
      navigate(`${base}/projects`)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update project')
      setSaving(false)
    }
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Dashboard', to: `${base}` },
          { label: 'Projects', to: `${base}/projects` },
        ]}
      />
      <h1>Edit project</h1>
      <p className="page-subtitle">Update the project details.</p>

      {error && <div className="alert">{error}</div>}
      {!error && (
        <form className="panel form-grid" onSubmit={onSubmit}>
          <label>
            Name *
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Website redesign"
              required
            />
          </label>
          <label>
            Start time
            <input
              type="datetime-local"
              value={form.start_time}
              onChange={(e) => set('start_time', e.target.value)}
            />
          </label>
          <label>
            Duration
            <span className="duration-row">
              <input
                type="number"
                min="0"
                placeholder="From"
                value={form.duration}
                onChange={(e) => set('duration', e.target.value)}
              />
              <span className="muted">–</span>
              <input
                type="number"
                min="0"
                placeholder="To"
                value={form.duration_to}
                onChange={(e) => set('duration_to', e.target.value)}
              />
              <select
                value={form.duration_unit}
                onChange={(e) => set('duration_unit', e.target.value)}
              >
                {DURATION_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </span>
          </label>
          {formError && <div className="alert form-alert">{formError}</div>}
          <div className="form-actions">
            <button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <Link to={`${base}/projects`} className="btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      )}
    </>
  )
}