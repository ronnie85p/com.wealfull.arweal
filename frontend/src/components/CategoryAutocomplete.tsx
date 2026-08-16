import { KeyboardEvent, useEffect, useRef, useState } from 'react'
import { api, Category } from '../api'
import { useAccountContext } from './AccountContext'

interface CategoryAutocompleteProps {
  onChange: (id: string) => void
  categories?: Category[]
  placeholder?: string
  initialId?: string
  initialLabel?: string
  focusSignal?: number
  onFocusApplied?: () => void
}

export default function CategoryAutocomplete({
  onChange,
  categories,
  placeholder = 'Select a category…',
  initialId = '',
  initialLabel = '',
  focusSignal = 0,
  onFocusApplied,
}: CategoryAutocompleteProps) {
  const { account } = useAccountContext()
  const accountId = account?.uuid ?? ''
  const [list, setList] = useState<Category[]>(categories ?? [])
  const [results, setResults] = useState<Category[]>([])
  const [searched, setSearched] = useState(false)
  const [search, setSearch] = useState(initialLabel)
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(-1)
  const [loading, setLoading] = useState(false)
  const initialLabelRef = useRef(initialLabel)
  const initialIdRef = useRef(initialId)
  const pickedLabelRef = useRef(initialLabel)
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
        .categories(q.trim(), accountId)
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
      .categories(undefined, accountId)
      .then(setList)
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (categories) {
      setList(categories)
      return
    }
    loadList()
  }, [categories])

  const filtered = (search.trim() && searched ? results : list).filter(
    (c) =>
      !search.trim() ||
      c.name.toLowerCase().includes(search.trim().toLowerCase()) ||
      c.description.toLowerCase().includes(search.trim().toLowerCase()),
  )

  function pick(c: Category) {
    pickedLabelRef.current = c.name
    setSearch(c.name)
    onChange(String(c.id))
    setOpen(false)
    setHighlight(-1)
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
    }
  }

  return (
    <div className="address-search">
      <input
        className="search-input"
        type="text"
        value={search}
        ref={inputRef}
        onChange={(e) => {
          const v = e.target.value
          setSearch(v)
          onChange('')
          setHighlight(-1)
          setOpen(true)
          searchRemote(v)
        }}
        onFocus={() => {
          if (search === initialLabelRef.current) setSearch('')
          setOpen(true)
          loadList()
        }}
        onBlur={() => {
          setOpen(false)
          setHighlight(-1)
          if (!search.trim()) {
            setSearch(initialLabelRef.current)
            onChange(initialIdRef.current)
          } else {
            setSearch(pickedLabelRef.current)
          }
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
      />
      {loading && <span className="address-search-spinner" />}
      {open && filtered.length > 0 && (
        <ul className="place-dropdown">
          {filtered.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                className={i === highlight ? 'active' : ''}
                onMouseDown={(e) => {
                  e.preventDefault()
                  pick(c)
                }}
                onMouseEnter={() => setHighlight(i)}
              >
                <span className="place-item-head">
                  <strong>{c.name}</strong>
                </span>
                {c.description && <span className="muted">{c.description}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
