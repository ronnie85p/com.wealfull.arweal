import { KeyboardEvent, useEffect, useRef, useState } from 'react'
import { api, Location } from '../api'

export interface LocationPick {
  id: number
  label: string
}

interface LocationAutocompleteProps {
  value: LocationPick[]
  onChange: (value: LocationPick[]) => void
  locations?: Location[]
  placeholder?: string
  focusSignal?: number
  onFocusApplied?: () => void
}

export default function LocationAutocomplete({
  value,
  onChange,
  locations,
  placeholder = 'Select a location…',
  focusSignal = 0,
  onFocusApplied,
}: LocationAutocompleteProps) {
  const [list, setList] = useState<Location[]>(locations ?? [])
  const [results, setResults] = useState<Location[]>([])
  const [searched, setSearched] = useState(false)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(-1)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchSeq = useRef(0)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
    }
  }, [])

  function searchRemote(q: string) {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (!q.trim()) {
      ++searchSeq.current
      setResults([])
      setSearched(false)
      setLoading(false)
      return
    }
    setSearched(false)
    setLoading(true)
    searchTimer.current = setTimeout(() => {
      const seq = ++searchSeq.current
      api
        .locations(q.trim())
        .then((res) => {
          if (seq === searchSeq.current) {
            setResults(res)
            setSearched(true)
          }
        })
        .catch(() => undefined)
        .finally(() => {
          if (seq === searchSeq.current) setLoading(false)
        })
    }, 3000)
  }

  useEffect(() => {
    if (focusSignal > 0) {
      inputRef.current?.focus()
      onFocusApplied?.()
    }
  }, [focusSignal, onFocusApplied])

  function loadList() {
    setLoading(true)
    api
      .locations()
      .then(setList)
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (locations) {
      setList(locations)
      return
    }
    loadList()
  }, [locations])

  const selectedIds = new Set(value.map((v) => v.id))
  const filtered = (search.trim() && searched ? results : list).filter(
    (l) =>
      !selectedIds.has(l.id) &&
      (!search.trim() ||
        l.full_location.toLowerCase().includes(search.trim().toLowerCase()) ||
        l.location.toLowerCase().includes(search.trim().toLowerCase())),
  )

  function pick(l: Location) {
    onChange([...value, { id: l.id, label: l.full_location || l.location }])
    setSearch('')
    setOpen(false)
    setHighlight(-1)
  }

  function remove(id: number) {
    onChange(value.filter((v) => v.id !== id))
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      if (filtered.length) setHighlight((h) => (h + 1) % filtered.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (filtered.length) setHighlight((h) => (h <= 0 ? filtered.length - 1 : h - 1))
    } else if (e.key === 'Enter') {
      if (filtered.length) {
        e.preventDefault()
        pick(filtered[highlight >= 0 ? highlight : 0])
      }
    } else if (e.key === 'Backspace' && !search && value.length) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className="chip-input">
      {value.map((v) => (
        <span key={v.id} className="tag chip">
          {v.label}
          <button
            type="button"
            className="chip-remove"
            onClick={() => remove(v.id)}
            aria-label={`Remove ${v.label}`}
          >
            ×
          </button>
        </span>
      ))}
      <div className="address-search">
        <input
          className="search-input"
          type="text"
          value={search}
          ref={inputRef}
          onChange={(e) => {
            const v = e.target.value
            setSearch(v)
            setHighlight(-1)
            setOpen(true)
            searchRemote(v)
          }}
          onFocus={() => {
            setOpen(true)
            loadList()
          }}
          onBlur={() => {
            setOpen(false)
            setHighlight(-1)
          }}
          onKeyDown={onKeyDown}
          placeholder={value.length ? '' : placeholder}
        />
        {loading && <span className="address-search-spinner" />}
        {open && filtered.length > 0 && (
          <ul className="place-dropdown">
            {filtered.map((l, i) => (
              <li key={l.id}>
                <button
                  type="button"
                  className={i === highlight ? 'active' : ''}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    pick(l)
                  }}
                  onMouseEnter={() => setHighlight(i)}
                >
                  <span className="place-item-head">
                    <strong>{l.location}</strong>
                  </span>
                  {l.full_location && <span className="muted">{l.full_location}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}