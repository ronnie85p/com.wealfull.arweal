import { useEffect, useRef, useState } from 'react'
import { api, Project } from '../api'

interface ProjectPickerProps {
  value: Project | null
  onChange: (project: Project | null) => void
}

export default function ProjectPicker({ value, onChange }: ProjectPickerProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Project[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

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
    if (value) {
      setQuery('')
      setOpen(false)
    }
  }, [value])

  useEffect(() => {
    const term = query.trim()
    setLoading(true)
    const timer = setTimeout(() => {
      api
        .projects(term)
        .then((r) => {
          setResults(r)
        })
        .catch(() => undefined)
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(timer)
  }, [query])

  function pick(p: Project) {
    onChange(p)
    setQuery('')
    setOpen(false)
  }

  return (
    <div className="user-picker" ref={rootRef}>
      <div className="user-picker-row">
        <div className="user-search">
          <input
            placeholder="Search project by name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            autoComplete="new-password"
          />
          {loading && <span className="user-hint">Searching…</span>}
          {open && results.length > 0 && (
            <ul className="user-results">
              {results.map((p) => (
                <li key={p.id} onMouseDown={() => pick(p)}>
                  <strong>{p.name}</strong>
                  <small>
                    {p.start_time ? new Date(p.start_time).toLocaleString() : 'no start'} ·{' '}
                    {p.duration}–{p.duration_to} {p.duration_unit}
                  </small>
                </li>
              ))}
            </ul>
          )}
          {open && !loading && results.length === 0 && (
            <div className="user-empty">No projects found.</div>
          )}
        </div>
      </div>
    </div>
  )
}
