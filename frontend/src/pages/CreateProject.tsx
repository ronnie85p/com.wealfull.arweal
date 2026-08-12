import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import Breadcrumbs from '../components/Breadcrumbs'

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

export default function CreateProject() {
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

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
      await api.createProject({
        name: form.name.trim(),
        start_time: form.start_time || null,
        duration: Number(form.duration) || 0,
        duration_to: Number(form.duration_to) || 0,
        duration_unit: form.duration_unit,
      })
      navigate('/app/projects')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create project')
      setSaving(false)
    }
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Dashboard', to: '/app' },
          { label: 'Projects', to: '/app/projects' },
        ]}
      />
      <h1>New project</h1>
      <p className="page-subtitle">Add a project.</p>

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
            {saving ? 'Saving…' : 'Create project'}
          </button>
          <Link to="/app/projects" className="btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </>
  )
}
