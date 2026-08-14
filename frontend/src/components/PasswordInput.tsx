import { useState } from 'react'
import MaskedInput from './MaskedInput'

export function passwordStrength(pw: string) {
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score > 4) score = 4
  return score
}

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong']
const STRENGTH_COLORS = ['', 'var(--red)', 'var(--amber)', 'var(--accent-2)', 'var(--green)']

interface PasswordInputProps {
  value: string
  onChange: (value: string) => void
  [key: string]: unknown
}

export default function PasswordInput({ value, onChange, ...rest }: PasswordInputProps) {
  const [focused, setFocused] = useState(false)
  const [show, setShow] = useState(false)
  const score = passwordStrength(value)
  const { onFocus, onBlur } = rest as { onFocus?: React.FocusEventHandler<HTMLInputElement>; onBlur?: React.FocusEventHandler<HTMLInputElement> }

  return (
    <span className="password-field">
      <MaskedInput
        {...rest}
        type={show ? 'text' : 'password'}
        autoComplete="new-password"
        value={value}
        mask={(raw) => raw}
        onChange={onChange}
        onFocus={(e) => {
          setFocused(true)
          onFocus?.(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          onBlur?.(e)
        }}
      />
      {value.length > 0 && (
        <button
          type="button"
          className="password-toggle"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Hide password' : 'Show password'}
          title={show ? 'Hide password' : 'Show password'}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {show ? (
              <>
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </>
            ) : (
              <>
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                <path d="M1 1l22 22" />
              </>
            )}
          </svg>
        </button>
      )}
      {focused && value.length > 0 && (
        <span className="password-tooltip" role="tooltip">
          <span className="tooltip-tail" />
          <span className="strength-label" style={{ color: STRENGTH_COLORS[score] }}>
            {STRENGTH_LABELS[score]}
          </span>
          <span className="strength-bar">
            {[1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="strength-seg"
                style={
                  i <= score
                    ? { background: STRENGTH_COLORS[score] }
                    : { background: 'var(--border)' }
                }
              />
            ))}
          </span>
          <span className="strength-hint">
            {score < 4 ? 'Use 8+ chars with upper/lower case, numbers and symbols' : 'Great password!'}
          </span>
        </span>
      )}
    </span>
  )
}