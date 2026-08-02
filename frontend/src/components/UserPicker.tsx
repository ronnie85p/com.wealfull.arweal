import { useEffect, useRef, useState } from 'react'
import { api, User } from '../api'

interface UserPickerProps {
  value: User | null
  onChange: (user: User | null) => void
}

function highlight(name: string, term: string) {
  if (!term) return name
  const idx = name.toLowerCase().indexOf(term.toLowerCase())
  if (idx === -1) return name
  return (
    <>
      {name.slice(0, idx)}
      <mark>{name.slice(idx, idx + term.length)}</mark>
      {name.slice(idx + term.length)}
    </>
  )
}

export default function UserPicker({ value, onChange }: UserPickerProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<User[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(-1)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ username: '', password: '', first_name: '', last_name: '', email: '' })
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    const term = query.trim()
    setLoading(true)
    const timer = setTimeout(() => {
      api
        .searchUsers(term)
        .then((r) => {
          setResults(r)
          setActive(-1)
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(timer)
  }, [query])

  function openOnFocus() {
    setOpen(true)
  }

  function pick(user: User) {
    onChange(user)
    setQuery('')
    setOpen(false)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      if (open && active >= 0 && results[active]) {
        e.preventDefault()
        pick(results[active])
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  async function onSubmitCreate() {
    if (!form.username.trim() || form.password.length < 6) {
      setError('Username is required and password must be at least 6 characters.')
      return
    }
    setError('')
    setCreating(true)
    try {
      const user = await api.createUser({
        username: form.username.trim(),
        password: form.password,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
      })
      onChange(user)
      setShowCreate(false)
      setForm({ username: '', password: '', first_name: '', last_name: '', email: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="user-picker" ref={rootRef}>
      <div className="user-picker-row">
        {value ? (
          <div className="chip">
            <span>
              {value.first_name || value.username} {value.last_name}{' '}
              <small>({value.username})</small>
            </span>
            <button type="button" className="chip-x" onClick={() => onChange(null)}>
              ×
            </button>
          </div>
        ) : (
          <div className="user-search">
            <input
              ref={inputRef}
              placeholder="Search customer by name or email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={openOnFocus}
              onKeyDown={onKeyDown}
              autoComplete="off"
            />
            {loading && <span className="user-hint">Searching…</span>}
            {open && results.length > 0 && (
              <ul className="user-results">
                {results.map((u, i) => (
                  <li
                    key={u.id}
                    className={i === active ? 'active' : ''}
                    onMouseDown={() => pick(u)}
                    onMouseEnter={() => setActive(i)}
                  >
                    {highlight(u.first_name || u.username, query.trim())} {u.last_name}
                    <small>{u.email || u.username}</small>
                  </li>
                ))}
              </ul>
            )}
            {open && !loading && results.length === 0 && (
              <div className="user-empty">No customers found.</div>
            )}
          </div>
        )}
        <button
          type="button"
          className="btn-secondary btn-sm user-picker-btn"
          onClick={() => setShowCreate((v) => !v)}
        >
          {showCreate ? 'Cancel' : '+ Create user'}
        </button>
      </div>
      {showCreate && (
        <div className="create-user">
          <div className="create-user-grid">
            <input
              placeholder="Username *"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            />
            <input
              type="password"
              placeholder="Password * (min 6)"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
            <input
              placeholder="First name"
              value={form.first_name}
              onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
            />
            <input
              placeholder="Last name"
              value={form.last_name}
              onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
            />
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          {error && <div className="alert form-alert">{error}</div>}
          <button type="button" className="button btn-sm" onClick={onSubmitCreate} disabled={creating}>
            {creating ? 'Creating…' : 'Create user'}
          </button>
        </div>
      )}
    </div>
  )
}