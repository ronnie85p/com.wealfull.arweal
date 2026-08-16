import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react'
import { api, Location, PlaceDetails, PlaceSuggestion } from '../api'
import TagInput from './TagInput'
import { useAccountContext } from './AccountContext'

function detectType(types?: string[]): string {
  if (!types?.length) return ''
  if (types.includes('locality')) return 'city'
  if (types.includes('administrative_area_level_2')) return 'county'
  if (types.includes('administrative_area_level_1')) return 'state'
  return ''
}

function typeLabel(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1)
}

interface LocationFormModalProps {
  onClose: () => void
  onCreated: (location: Location) => void
}

export default function LocationFormModal({ onClose, onCreated }: LocationFormModalProps) {
  const { account } = useAccountContext()
  const accountId = account?.uuid ?? ''
  const [name, setName] = useState('')
  const [committedName, setCommittedName] = useState('')
  const [pickedType, setPickedType] = useState('')
  const [placeData, setPlaceData] = useState<PlaceDetails | null>(null)
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [placeResults, setPlaceResults] = useState<PlaceSuggestion[]>([])
  const [placesLoading, setPlacesLoading] = useState(false)
  const [placesError, setPlacesError] = useState('')
  const [highlight, setHighlight] = useState(-1)
  const [focused, setFocused] = useState(false)
  const searchSeq = useRef(0)
  const pickedRef = useRef(false)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (highlight < 0 || !listRef.current) return
    const el = listRef.current.children[highlight] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [highlight])

  useEffect(() => {
    const q = name.trim()
    const seq = ++searchSeq.current
    if (!q || pickedRef.current) {
      setPlaceResults([])
      setPlacesError('')
      setPlacesLoading(false)
      return
    }
    const t = setTimeout(async () => {
      setPlacesLoading(true)
      try {
        const res = await api.placesAutocomplete(q)
        if (seq !== searchSeq.current) return
        const changed =
          res.results.length !== placeResults.length ||
          (res.results[0]?.place_id ?? '') !== (placeResults[0]?.place_id ?? '')
        setPlaceResults(res.results)
        if (changed) setHighlight(-1)
        setPlacesError('')
      } catch (err) {
        if (seq !== searchSeq.current) return
        setPlaceResults([])
        setPlacesError(
          err instanceof Error && /403|401/.test(err.message)
            ? 'Google Places API is not enabled for this API key. Enable "Places API (New)" in the Google Cloud console.'
            : 'Google Places search failed. Try again later.'
        )
      } finally {
        if (seq === searchSeq.current) setPlacesLoading(false)
      }
    }, 350)
    return () => clearTimeout(t)
  }, [name])

  function onNameChange(v: string) {
    pickedRef.current = false
    setName(v)
    setHighlight(-1)
    if (!v.trim()) setPickedType('')
  }

  function onNameKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (placeResults.length) setHighlight((h) => (h + 1) % placeResults.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (placeResults.length) {
        setHighlight((h) => (h <= 0 ? placeResults.length - 1 : h - 1))
      }
    } else if (e.key === 'Enter') {
      if (placeResults.length) {
        e.preventDefault()
        pickPlace(placeResults[highlight >= 0 ? highlight : 0])
      }
    }
  }

  async function pickPlace(p: PlaceSuggestion) {
    pickedRef.current = true
    setPlaceResults([])
    setPlaceData(null)
    setName(p.main_text)
    setCommittedName(p.main_text)
    setPickedType(detectType(p.types))
    try {
      setPlaceData(await api.placeDetails(p.place_id))
    } catch {
      setPlaceData(null)
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      const location = await api.createLocation({
        location: name.trim(),
        description: description.trim(),
        tags: tags.join(', '),
        full_location: placeData?.formatted_address ?? '',
        latitude: placeData?.latitude ?? null,
        longitude: placeData?.longitude ?? null,
        country: placeData?.country ?? '',
        type: pickedType,
        city: placeData?.city ?? '',
        county: placeData?.county ?? '',
        state: placeData?.state ?? '',
        short_state: placeData?.short_state ?? '',
        postal_code: placeData?.postal_code ?? '',
      }, accountId)
      onCreated(location)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create location')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>New location</h3>
        <form className="modal-form" onSubmit={onSubmit}>
          <label className="field-label">
            Location
            <div className="address-search">
              <input
                className="search-input"
                type="text"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                onKeyDown={onNameKeyDown}
                autoFocus
                onFocus={() => setFocused(true)}
                onBlur={(e) => {
                  const wrap = e.currentTarget.parentElement
                  if (e.relatedTarget && wrap?.contains(e.relatedTarget as Node)) return
                  setFocused(false)
                  if (name.trim()) setName(committedName)
                }}
                placeholder="Search Google for a city, county or state…"
              />
              {placesLoading && <span className="address-search-spinner" />}
              {focused && name.trim() && placeResults.length > 0 && (
                <ul className="place-dropdown" ref={listRef}>
                  {placeResults.map((p, i) => {
                    const t = detectType(p.types)
                    return (
                      <li key={p.place_id}>
                        <button
                          type="button"
                          className={i === highlight ? 'active' : ''}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            pickPlace(p)
                          }}
                          onMouseEnter={() => setHighlight(i)}
                        >
                          <span className="place-item-head">
                            <strong>{p.main_text}</strong>
                            {t && <span className="place-item-type">{typeLabel(t)}</span>}
                          </span>
                          <span className="muted">{p.secondary_text || p.description}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
              {placesError && <span className="alert-inline">{placesError}</span>}
            </div>
            {pickedType && (
              <span className="picked-type">
                Type: <span className="tag">{typeLabel(pickedType)}</span>
              </span>
            )}
            {placeData && (
              <div className="place-info">
                <div className="place-info-row">
                  <span className="muted">Full location</span>
                  <strong>{placeData.formatted_address}</strong>
                </div>
                {placeData.latitude != null && placeData.longitude != null && (
                  <div className="place-info-row">
                    <span className="muted">Coordinates</span>
                    <strong>
                      {placeData.latitude}, {placeData.longitude}
                    </strong>
                  </div>
                )}
                <div className="place-info-grid">
                  {placeData.country && (
                    <span className="place-info-cell">
                      <span className="muted">Country</span>
                      {placeData.country}
                    </span>
                  )}
                  {placeData.city && (
                    <span className="place-info-cell">
                      <span className="muted">City</span>
                      {placeData.city}
                    </span>
                  )}
                  {placeData.county && (
                    <span className="place-info-cell">
                      <span className="muted">County</span>
                      {placeData.county}
                    </span>
                  )}
                  {placeData.state && (
                    <span className="place-info-cell">
                      <span className="muted">State</span>
                      {placeData.state}
                      {placeData.short_state && ` (${placeData.short_state})`}
                    </span>
                  )}
                  {placeData.postal_code && (
                    <span className="place-info-cell">
                      <span className="muted">ZIP</span>
                      {placeData.postal_code}
                    </span>
                  )}
                </div>
              </div>
            )}
          </label>
          <label className="field-label">
            Description
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this location for?"
            />
          </label>
          <label className="field-label">
            Tags
            <TagInput value={tags} onChange={setTags} />
          </label>
          {error && <div className="alert">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={busy || !name.trim()}>
              {busy ? 'Saving…' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}