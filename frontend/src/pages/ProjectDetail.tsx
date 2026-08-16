import { FormEvent, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, Project } from '../api'
import Breadcrumbs from '../components/Breadcrumbs'
import { useAccountContext } from '../components/AccountContext'
import { useAccountBase } from '../lib/account'

const DURATION_UNITS = [
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'months', label: 'Months' },
]

interface ProjectForm {
  name: string
  description: string
  startTime: string
  duration: string
  durationTo: string
  durationUnit: string
  availableFrom: string
  availableTo: string
}

const durationText = (p: Project) => {
  if (!p.duration && !p.duration_to) return '—'
  const parts: string[] = []
  if (p.duration) parts.push(String(p.duration))
  if (p.duration_to) parts.push(String(p.duration_to))
  const unit =
    p.duration_unit === 'weeks' ? (Number(parts[0]) === 1 ? 'week' : 'weeks')
    : p.duration_unit === 'months' ? (Number(parts[0]) === 1 ? 'month' : 'months')
    : Number(parts[0]) === 1 ? 'day'
    : 'days'
  return `${parts.join('–')} ${unit}`
}

const fmt = (v: string | null) => (v ? new Date(v).toLocaleString() : '—')

export default function ProjectDetail() {
  const { id } = useParams()
  const projectId = Number(id)
  const base = useAccountBase()
  const { account } = useAccountContext()
  const accountId = account?.uuid ?? ''
  const navigate = useNavigate()

  const [item, setItem] = useState<Project | null>(null)
  const [error, setError] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState<ProjectForm | null>(null)
  const [initialForm, setInitialForm] = useState<ProjectForm | null>(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (!projectId) {
      setError('Project not found.')
      return
    }
    api
      .project(projectId, accountId)
      .then(setItem)
      .catch((e) => setError(e.message))
  }, [projectId, accountId])

  const dirty = initialForm !== null && form !== null && JSON.stringify(form) !== JSON.stringify(initialForm)

  function openEdit() {
    if (!item) return
    const next: ProjectForm = {
      name: item.name,
      description: item.description,
      startTime: item.start_time ? new Date(item.start_time).toISOString().slice(0, 16) : '',
      duration: item.duration ? String(item.duration) : '',
      durationTo: item.duration_to ? String(item.duration_to) : '',
      durationUnit: item.duration_unit,
      availableFrom: item.available_from ? new Date(item.available_from).toISOString().slice(0, 16) : '',
      availableTo: item.available_to ? new Date(item.available_to).toISOString().slice(0, 16) : '',
    }
    setForm(next)
    setInitialForm(next)
    setFormError('')
    setEditOpen(true)
  }

  async function onSave(e: FormEvent) {
    e.preventDefault()
    if (!form || busy) return
    if (!form.name.trim()) {
      setFormError('Name is required.')
      return
    }
    if (form.duration && form.durationTo && Number(form.duration) > Number(form.durationTo)) {
      setFormError('Duration start cannot exceed duration end.')
      return
    }
    setFormError('')
    setBusy(true)
    try {
      const payload = {
        account_id: account?.uuid ?? null,
        name: form.name.trim(),
        description: form.description.trim(),
        start_time: form.startTime || null,
        duration: form.duration ? Number(form.duration) : 0,
        duration_to: form.durationTo ? Number(form.durationTo) : 0,
        duration_unit: form.durationUnit,
        available_from: form.availableFrom || null,
        available_to: form.availableTo || null,
      }
      await api.updateProject(projectId, payload, accountId)
      setEditOpen(false)
      const updated = await api.project(projectId, accountId)
      setItem(updated)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save project')
    } finally {
      setBusy(false)
    }
  }

  async function onDelete() {
    if (!item || busy) return
    setBusy(true)
    setError('')
    try {
      await api.deleteProject(item.id, accountId)
      navigate(`${base}/projects`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project')
      setBusy(false)
    }
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Dashboard', to: `${base}` },
          { label: 'Projects', to: `${base}/projects` },
          { label: item ? item.name : '…' },
        ]}
      />
      {error && <div className="alert">{error}</div>}
      {item && (
        <>
          <div className="page-head">
            <div>
              <h1>{item.name}</h1>
              {item.description && (
                <p className="page-subtitle no-margin location-subtitle">
                  <span className="muted subtitle-location">{item.description}</span>
                </p>
              )}
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
                  <span className="muted">Start time</span>
                  {fmt(item.start_time)}
                </span>
                <span className="place-info-cell">
                  <span className="muted">Duration</span>
                  {durationText(item)}
                </span>
                <span className="place-info-cell">
                  <span className="muted">Available</span>
                  {item.available_from || item.available_to
                    ? `${fmt(item.available_from)} – ${fmt(item.available_to)}`
                    : '—'}
                </span>
                <span className="place-info-cell">
                  <span className="muted">Created</span>
                  {new Date(item.created_at).toLocaleString()}
                </span>
              </div>
            </div>
            {item.description && (
              <div className="place-info detail-extra">
                <div className="description-box">{item.description}</div>
              </div>
            )}
          </div>
        </>
      )}

      {editOpen && item && form && (
        <div className="modal-overlay">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Edit project</h3>
            <form className="modal-form" onSubmit={onSave}>
              <label className="field-label">
                Name
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => (f ? { ...f, name: e.target.value } : f))}
                  placeholder="e.g. Website redesign"
                />
              </label>
              <label className="field-label">
                Description
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => (f ? { ...f, description: e.target.value } : f))}
                  placeholder="What is this project about?"
                />
              </label>
              <div className="form-row">
                <label className="field-label">
                  Start time
                  <input
                    type="datetime-local"
                    value={form.startTime}
                    onChange={(e) => setForm((f) => (f ? { ...f, startTime: e.target.value } : f))}
                  />
                </label>
              </div>
              <label className="field-label project-field-duration">
                Available
                <span className="duration-row">
                  <input
                    type="datetime-local"
                    value={form.availableFrom}
                    onChange={(e) => setForm((f) => (f ? { ...f, availableFrom: e.target.value } : f))}
                  />
                  <span className="muted">–</span>
                  <input
                    type="datetime-local"
                    value={form.availableTo}
                    onChange={(e) => setForm((f) => (f ? { ...f, availableTo: e.target.value } : f))}
                  />
                </span>
              </label>
              <label className="field-label project-field-duration">
                Duration
                <span className="duration-row">
                  <input
                    type="number"
                    min="0"
                    max={form.durationTo ? Number(form.durationTo) : undefined}
                    placeholder="From"
                    value={form.duration}
                    onChange={(e) => setForm((f) => (f ? { ...f, duration: e.target.value } : f))}
                  />
                  <span className="muted">–</span>
                  <input
                    type="number"
                    min={form.duration ? Number(form.duration) : 0}
                    placeholder="To"
                    value={form.durationTo}
                    onChange={(e) => setForm((f) => (f ? { ...f, durationTo: e.target.value } : f))}
                  />
                  <select
                    value={form.durationUnit}
                    onChange={(e) => setForm((f) => (f ? { ...f, durationUnit: e.target.value } : f))}
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
