import { FormEvent, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api, Project } from '../api'
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

const emptyForm: ProjectForm = {
  name: '',
  description: '',
  startTime: '',
  duration: '',
  durationTo: '',
  durationUnit: 'days',
  availableFrom: '',
  availableTo: '',
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

export default function Projects() {
  const location = useLocation()
  const base = useAccountBase()
  const { account } = useAccountContext()
  const [items, setItems] = useState<Project[]>([])
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<ProjectForm>(emptyForm)
  const [initialForm, setInitialForm] = useState<ProjectForm | null>(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')

  function load() {
    if (!account?.uuid) return
    api.projects(undefined, account.uuid).then(setItems).catch((e) => setError(e.message))
  }

  useEffect(load, [account?.uuid])

  useEffect(() => {
    if ((location.state as { openNew?: boolean } | null)?.openNew) {
      openModal()
      window.history.replaceState({}, '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  const dirty = initialForm !== null && JSON.stringify(form) !== JSON.stringify(initialForm)

  function set<K extends keyof ProjectForm>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function openModal(p?: Project) {
    setEditingId(p ? p.id : null)
    const next = p
      ? {
          name: p.name,
          description: p.description,
          startTime: p.start_time ? new Date(p.start_time).toISOString().slice(0, 16) : '',
          duration: p.duration ? String(p.duration) : '',
          durationTo: p.duration_to ? String(p.duration_to) : '',
          durationUnit: p.duration_unit,
          availableFrom: p.available_from ? new Date(p.available_from).toISOString().slice(0, 16) : '',
          availableTo: p.available_to ? new Date(p.available_to).toISOString().slice(0, 16) : '',
        }
      : { ...emptyForm }
    setForm(next)
    setInitialForm(next)
    setFormError('')
    setModalOpen(true)
  }

  async function onSave(e: FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      setFormError('Name is required.')
      return
    }
    if (
      form.duration &&
      form.durationTo &&
      Number(form.duration) > Number(form.durationTo)
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
        description: form.description.trim(),
        start_time: form.startTime || null,
        duration: form.duration ? Number(form.duration) : 0,
        duration_to: form.durationTo ? Number(form.durationTo) : 0,
        duration_unit: form.durationUnit,
        available_from: form.availableFrom || null,
        available_to: form.availableTo || null,
      }
      if (editingId) {
        await api.updateProject(editingId, payload, account?.uuid ?? '')
      } else {
        await api.createProject(payload, account?.uuid ?? '')
      }
      setModalOpen(false)
      load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save project')
    } finally {
      setBusy(false)
    }
  }

  async function remove(p: Project) {
    try {
      await api.deleteProject(p.id, account?.uuid ?? '')
      setItems((prev) => prev.map((x) => (x.id === p.id ? { ...x, deleted: true } : x)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project')
    }
  }

  async function restore(p: Project) {
    try {
      await api.restoreProject(p.id, account?.uuid ?? '')
      setItems((prev) => prev.map((x) => (x.id === p.id ? { ...x, deleted: false } : x)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore project')
    }
  }

  function dismissDeleted(p: Project) {
    setItems((prev) => prev.filter((x) => x.id !== p.id))
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Projects</h1>
          <p className="page-subtitle no-margin">Your projects.</p>
        </div>
        <div className="page-head-actions">
          <button type="button" className="button" onClick={() => openModal()}>
            Add Project
          </button>
        </div>
      </div>
      {error && <div className="alert">{error}</div>}

      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Start time</th>
              <th>Duration</th>
              <th>Created</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((p) =>
              p.deleted ? (
                <tr key={p.id} className="deleted-row">
                  <td colSpan={5}>
                    <div className="deleted-inline">
                      <span>
                        <strong>{p.name}</strong> deleted.
                      </span>
                      <span className="row-actions">
                        <button type="button" className="btn-sm" onClick={() => restore(p)}>
                          Undo
                        </button>
                        <button type="button" className="btn-sm" onClick={() => dismissDeleted(p)}>
                          Dismiss
                        </button>
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={p.id}>
                  <td>
                    <Link to={`${base}/projects/${p.id}`} className="location-link">
                      <strong>{p.name}</strong>
                    </Link>
                  </td>
                  <td>{p.start_time ? new Date(p.start_time).toLocaleString() : '—'}</td>
                  <td>{durationText(p)}</td>
                  <td>{new Date(p.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className="btn-sm" onClick={() => openModal(p)}>
                        Edit
                      </button>
                      <button type="button" className="btn-danger btn-sm" onClick={() => remove(p)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ),
            )}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="empty">
                  No projects.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingId ? 'Edit project' : 'New project'}</h3>
            <form className="modal-form" onSubmit={onSave}>
              <label className="field-label">
                Name
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="e.g. Website redesign"
                />
              </label>
              <label className="field-label">
                Description
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="What is this project about?"
                />
              </label>
              <div className="form-row">
                <label className="field-label">
                  Start time
                  <input
                    type="datetime-local"
                    value={form.startTime}
                    onChange={(e) => set('startTime', e.target.value)}
                  />
                </label>
              </div>
              <label className="field-label project-field-duration">
                Available
                <span className="duration-row">
                  <input
                    type="datetime-local"
                    value={form.availableFrom}
                    onChange={(e) => set('availableFrom', e.target.value)}
                  />
                  <span className="muted">–</span>
                  <input
                    type="datetime-local"
                    value={form.availableTo}
                    onChange={(e) => set('availableTo', e.target.value)}
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
                    onChange={(e) => set('duration', e.target.value)}
                  />
                  <span className="muted">–</span>
                  <input
                    type="number"
                    min={form.duration ? Number(form.duration) : 0}
                    placeholder="To"
                    value={form.durationTo}
                    onChange={(e) => set('durationTo', e.target.value)}
                  />
                  <select
                    value={form.durationUnit}
                    onChange={(e) => set('durationUnit', e.target.value)}
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
    </>
  )
}
