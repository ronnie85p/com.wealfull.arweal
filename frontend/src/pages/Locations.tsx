import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, Location, PlaceDetails, PlaceSuggestion } from '../api'
import TagInput from '../components/TagInput'
import { useAccountBase } from '../lib/account'

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

export default function Locations() {
  const base = useAccountBase()
  const [items, setItems] = useState<Location[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [committedName, setCommittedName] = useState('')
  const [pickedType, setPickedType] = useState('')
  const [placeData, setPlaceData] = useState<PlaceDetails | null>(null)
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Location | null>(null)
  const [editDescription, setEditDescription] = useState('')
  const [editTags, setEditTags] = useState<string[]>([])
  const [editBusy, setEditBusy] = useState(false)
  const [editError, setEditError] = useState('')
  const [placeResults, setPlaceResults] = useState<PlaceSuggestion[]>([])
  const [placesLoading, setPlacesLoading] = useState(false)
  const [placesError, setPlacesError] = useState('')
  const [highlight, setHighlight] = useState(-1)
  const [focused, setFocused] = useState(false)
  const [updating, setUpdating] = useState(false)
  const searchSeq = useRef(0)
  const pickedRef = useRef(false)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (highlight < 0 || !listRef.current) return
    const el = listRef.current.children[highlight] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [highlight])

  function load() {
    api.locations().then(setItems).catch((e) => setError(e.message))
  }

  useEffect(load, [])

  useEffect(() => {
    const q = name.trim()
    if (!modalOpen || editingId) return
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
  }, [name, modalOpen])

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

  async function refreshPlaceData() {
    const q = name.trim()
    if (!q || updating) return
    setUpdating(true)
    setPlacesError('')
    try {
      const res = await api.placesAutocomplete(q)
      const p = res.results[0]
      if (!p) throw new Error('Location not found on Google Maps')
      const d = await api.placeDetails(p.place_id)
      setPlaceData(d)
      setPickedType(detectType(p.types))
      setName(p.main_text)
      setCommittedName(p.main_text)
    } catch (err) {
      setPlacesError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setUpdating(false)
    }
  }

  function openModal(l?: Location) {
    setEditingId(l ? l.id : null)
    setName(l ? l.location : '')
    setCommittedName(l ? l.location : '')
    setPickedType(l ? l.type : '')
    setPlaceData(
      l
        ? {
            formatted_address: l.full_location,
            street: '',
            city: l.city,
            state: l.state,
            postal_code: l.postal_code,
            county: l.county,
            country: l.country,
            short_state: l.short_state,
            latitude: l.latitude,
            longitude: l.longitude,
          }
        : null,
    )
    setDescription(l ? l.description : '')
    setTags(l ? l.tags.split(',').map((t) => t.trim()).filter(Boolean) : [])
    setError('')
    setPlaceResults([])
    setPlacesError('')
    pickedRef.current = false
    setModalOpen(true)
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || busy) return
    setBusy(true)
    setError('')
    const payload = {
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
    }
    try {
      if (editingId) await api.updateLocation(editingId, payload)
      else await api.createLocation(payload)
      setModalOpen(false)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save location')
    } finally {
      setBusy(false)
    }
  }

  async function remove(l: Location) {
    if (!window.confirm(`Delete location "${l.location}"?`)) return
    try {
      await api.deleteLocation(l.id)
      setItems((prev) => prev.filter((x) => x.id !== l.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete location')
    }
  }

  function openEdit(l: Location) {
    setEditTarget(l)
    setEditDescription(l.description)
    setEditTags(l.tags.split(',').map((t) => t.trim()).filter(Boolean))
    setEditError('')
    setEditOpen(true)
  }

  async function onSaveEdit(e: FormEvent) {
    e.preventDefault()
    if (!editTarget || editBusy) return
    setEditBusy(true)
    setEditError('')
    try {
      await api.updateLocation(editTarget.id, {
        description: editDescription.trim(),
        tags: editTags.join(', '),
      })
      setEditOpen(false)
      load()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to save location')
    } finally {
      setEditBusy(false)
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Locations</h1>
          <p className="page-subtitle no-margin">Your locations and venues.</p>
        </div>
        <div className="page-head-actions">
          <button type="button" className="button" onClick={() => openModal()}>
            Add Location
          </button>
        </div>
      </div>
      {error && <div className="alert">{error}</div>}

      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Location</th>
              <th>Description</th>
              <th>Created</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((l) => (
              <tr key={l.id}>
                <td>
                  <div className="location-cell">
                    <Link to={`${base}/locations/${l.id}`} className="location-link">
                      <strong>{l.location}</strong>
                    </Link>
                    {l.type && (
                      <span className="picked-type">
                        Type: <span className="tag">{typeLabel(l.type)}</span>
                      </span>
                    )}
                  </div>
                </td>
                <td>{l.description}</td>
                <td>{new Date(l.created_at).toLocaleDateString()}</td>
                <td>
                  <div className="row-actions">
                    <button type="button" className="btn btn-sm" onClick={() => openEdit(l)}>
                      Edit
                    </button>
                    <button type="button" className="btn-danger btn-sm" onClick={() => remove(l)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="empty">
                  No locations yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingId ? 'Edit location' : 'New location'}</h3>
            <form className="modal-form" onSubmit={onCreate}>
              <label className="field-label">
                Location
                <div className="address-search">
                  <input
                    className={`search-input${editingId ? ' readonly' : ''}`}
                    type="text"
                    value={name}
                    readOnly={!!editingId}
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
                  {!editingId && placesLoading && <span className="address-search-spinner" />}
                  {!editingId && focused && name.trim() && placeResults.length > 0 && (
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
                    {editingId && (
                      <div className="place-info-footer">
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={refreshPlaceData}
                          disabled={updating}
                        >
                          {updating ? 'Updating…' : 'Update'}
                        </button>
                      </div>
                    )}
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
              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn primary" disabled={busy || !name.trim()}>
                  {busy ? 'Saving…' : editingId ? 'Save' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editOpen && editTarget && (
        <div className="modal-overlay">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Edit location</h3>
            <p className="page-subtitle no-margin location-subtitle">
              <span className="muted subtitle-location">{editTarget.full_location || editTarget.location}</span>
              {editTarget.type && <span className="tag">{typeLabel(editTarget.type)}</span>}
            </p>
            <form className="modal-form" onSubmit={onSaveEdit}>
              <label className="field-label">
                Description
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="What is this location for?"
                />
              </label>
              <label className="field-label">
                Tags
                <TagInput value={editTags} onChange={setEditTags} />
              </label>
              {editError && <div className="alert">{editError}</div>}
              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setEditOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn primary" disabled={editBusy}>
                  {editBusy ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
