import { KeyboardEvent, useState } from 'react'

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}

export default function TagInput({
  value,
  onChange,
  placeholder = 'Type a tag and press Enter',
}: TagInputProps) {
  const [draft, setDraft] = useState('')

  function add() {
    const t = draft.trim()
    if (t && !value.includes(t)) onChange([...value, t])
    setDraft('')
  }

  function remove(t: string) {
    onChange(value.filter((x) => x !== t))
  }

  return (
    <div className="chip-input">
      {value.map((t) => (
        <span key={t} className="tag chip">
          {t}
          <button
            type="button"
            className="chip-remove"
            onClick={() => remove(t)}
            aria-label={`Remove ${t}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            add()
          } else if (e.key === 'Backspace' && !draft && value.length) {
            onChange(value.slice(0, -1))
          }
        }}
        onBlur={add}
        placeholder={value.length ? '' : placeholder}
      />
    </div>
  )
}
