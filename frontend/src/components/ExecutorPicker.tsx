import { useEffect, useRef, useState } from 'react'
import { api, User } from '../api'

interface ExecutorPickerProps {
  value: User[]
  onChange: (users: User[]) => void
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

export default function ExecutorPicker({ value, onChange }: ExecutorPickerProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<User[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(-1)
  const [error, setError] = useState('')
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
      const req = term ? api.searchUsers(term) : api.recentUsers()
      req
        .then((r) => {
          setResults(r.filter((u) => !value.some((v) => v.id === u.id)))
          setActive(-1)
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(timer)
  }, [query, value])

  function openOnFocus() {
    setOpen(true)
  }

  function pick(user: User) {
    if (!value.some((v) => v.id === user.id)) {
      onChange([...value, user])
    }
    setQuery('')
    setOpen(false)
    inputRef.current?.focus()
  }

  function remove(id: number) {
    onChange(value.filter((u) => u.id !== id))
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
      if (open && results.length > 0) {
        const target = active >= 0 ? results[active] : results[0]
        if (target) {
          e.preventDefault()
          pick(target)
        }
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const display = (u: User) => `${u.first_name || u.username} ${u.last_name}`.trim()

  return (
    <div className="user-picker" ref={rootRef}>
      <div className="user-search">
        <input
          ref={inputRef}
          placeholder="Search executors by name or email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={openOnFocus}
          onKeyDown={onKeyDown}
          autoComplete="new-password"
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
          <div className="user-empty">No executors found.</div>
        )}
      </div>
      {value.length > 0 && (
        <div className="executor-chips">
          {value.map((u) => (
            <span key={u.id} className="executor-chip">
              {display(u)}
              <button type="button" className="executor-chip-x" onClick={() => remove(u.id)} aria-label="Remove">
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      {error && <div className="alert form-alert">{error}</div>}
    </div>
  )
}
