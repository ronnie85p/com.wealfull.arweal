import { FormEvent, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api, setToken } from '../api'
import SpinnerButton from '../components/SpinnerButton'
import { useAccountBase } from '../lib/account'

const CODE_LENGTH = 6
const CODE_TTL_MS = 900_000
const RESEND_COOLDOWN_MS = 30_000
const STORAGE_KEY = 'wf_code_expires_at'
const RESEND_KEY = 'wf_code_resend_at'

type ConfirmMode = 'register' | 'login'

const state = () =>
  (useLocation().state as { email?: string; code?: string; mode?: ConfirmMode } | null) ?? {}

function readExpiry(): number | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  const ms = Number(raw)
  return Number.isFinite(ms) && ms > 0 ? ms : null
}

function saveExpiry(ms: number) {
  localStorage.setItem(STORAGE_KEY, String(ms))
}

function clearExpiry() {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(RESEND_KEY)
}

function saveResendAt(ms: number) {
  localStorage.setItem(RESEND_KEY, String(ms))
}

export default function Confirm() {
  const navigate = useNavigate()
  const base = useAccountBase()
  const { email: stateEmail, code: stateCode, mode = 'register' } = state()
  const backTo = mode === 'login' ? '/login' : '/register'
  const [email] = useState(stateEmail ?? localStorage.getItem('wf_registration_email') ?? '')
  const [checked, setChecked] = useState(false)
  const [serverExpiry, setServerExpiry] = useState<number | null>(null)
  const [digits, setDigits] = useState<string[]>(Array.from({ length: CODE_LENGTH }, () => ''))
  const [toastCode, setToastCode] = useState(stateCode ?? '')
  const refs = useRef<(HTMLInputElement | null)[]>([])

  const code = digits.join('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const submittingRef = useRef(false)
  const [remaining, setRemaining] = useState(0)
  const [resendAt, setResendAt] = useState<number>(() => Number(localStorage.getItem(RESEND_KEY)) || 0)
  const [resendRemaining, setResendRemaining] = useState(0)

  useEffect(() => {
    if (resendAt <= Date.now()) return
    let cancelled = false
    const id = setInterval(() => {
      if (cancelled) return
      const left = resendAt - Date.now()
      if (left <= 0) {
        cancelled = true
        clearInterval(id)
        setResendRemaining(0)
      } else {
        setResendRemaining(Math.ceil(left / 1000))
      }
    }, 250)
    setResendRemaining(Math.ceil((resendAt - Date.now()) / 1000))
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [resendAt])

  useEffect(() => {
    if (!email) {
      navigate(backTo, { replace: true })
      return
    }
    localStorage.setItem('wf_registration_email', email)
    let cancelled = false
    const check = mode === 'login' ? api.loginCheckCode(email) : api.checkRegistration(email)
    check
      .then((data) => {
        if (cancelled) return
        if (!data.active) {
          clearExpiry()
          navigate(backTo, { replace: true })
          return
        }
        const serverMs = data.expires_at ? new Date(data.expires_at).getTime() : null
        if (serverMs) {
          saveExpiry(serverMs)
          setServerExpiry(serverMs)
        }
        setChecked(true)
      })
      .catch(() => {
        if (!cancelled) setChecked(true)
      })
    return () => {
      cancelled = true
    }
  }, [email, navigate, mode, backTo])

  useEffect(() => {
    if (stateCode && stateCode.length === CODE_LENGTH) {
      refs.current[CODE_LENGTH - 1]?.focus()
    } else {
      refs.current[0]?.focus()
    }
  }, [stateCode])

  useEffect(() => {
    const expiry = serverExpiry ?? readExpiry()
    if (expiry === null && !stateCode) {
      clearExpiry()
      setRemaining(0)
      return
    }
    let expiresAt = expiry
    if (expiresAt === null || expiresAt <= Date.now()) {
      setRemaining(0)
      return
    }
    setRemaining(Math.max(1, Math.ceil((expiresAt - Date.now()) / 1000)))
    const id = setInterval(() => {
      const left = expiresAt! - Date.now()
      if (left <= 0) {
        clearInterval(id)
        setRemaining(0)
      } else {
        setRemaining(Math.ceil(left / 1000))
      }
    }, 250)
    return () => clearInterval(id)
  }, [stateCode, serverExpiry])

  function setDigit(i: number, value: string) {
    const digitsOnly = value.replace(/\D/g, '')
    if (digitsOnly.length > 1) {
      const next = Array.from({ length: CODE_LENGTH }, (_, k) => digitsOnly[k] ?? '')
      setDigits(next)
      const last = Math.min(digitsOnly.length, CODE_LENGTH) - 1
      refs.current[last]?.focus()
      if (digitsOnly.length >= CODE_LENGTH) submit(next.join(''))
      return
    }
    setDigits((d) => {
      const next = [...d]
      next[i] = digitsOnly
      if (next.join('').length === CODE_LENGTH) submit(next.join(''))
      return next
    })
    if (digitsOnly && i < CODE_LENGTH - 1) refs.current[i + 1]?.focus()
  }

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '')
    if (!pasted) return
    const next = Array.from({ length: CODE_LENGTH }, (_, k) => pasted[k] ?? '')
    setDigits(next)
    const last = Math.min(pasted.length, CODE_LENGTH) - 1
    refs.current[last]?.focus()
    if (pasted.length >= CODE_LENGTH) submit(next.join(''))
  }

  async function submit(codeToSend: string) {
    if (submittingRef.current) return
    setError('')
    setLoading(true)
    submittingRef.current = true
    try {
      if (mode === 'login') {
        const data = await api.loginConfirm(email, codeToSend)
        clearExpiry()
        setToken(data.token)
        navigate(`${base}`, { replace: true })
        return
      }
      await api.confirm({ code: codeToSend, email, password: '' })
      clearExpiry()
      navigate('/security', { state: { email } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Confirmation failed')
      setLoading(false)
      submittingRef.current = false
    }
  }

  async function resend() {
    if (resending) return
    setResending(true)
    setError('')
    try {
      const data =
        mode === 'login'
          ? await api.loginSendCode(email)
          : await api.resendCode(email)
      const expiresAt = data.expires_at ? new Date(data.expires_at).getTime() : Date.now() + CODE_TTL_MS
      saveExpiry(expiresAt)
      setServerExpiry(expiresAt)
      const resendMs = Date.now() + RESEND_COOLDOWN_MS
      saveResendAt(resendMs)
      setResendAt(resendMs)
      setToastCode(data.code)
      setDigits(Array.from({ length: CODE_LENGTH }, () => ''))
      setRemaining(Math.ceil((expiresAt - Date.now()) / 1000))
      setResendRemaining(RESEND_COOLDOWN_MS / 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend code')
    } finally {
      setResending(false)
    }
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus()
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus()
    if (e.key === 'ArrowRight' && i < CODE_LENGTH - 1) refs.current[i + 1]?.focus()
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (loading) return
    if (code.length !== CODE_LENGTH) {
      setError('Enter the 6-digit code.')
      return
    }
    submit(code)
  }

  const expired = remaining === 0

  if (!checked) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <div className="auth-brand">
            <span className="brand-mark">W</span>
            <h1>Wealfull CRM</h1>
            <p>Checking confirmation status…</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-wrap">
      {toastCode && <div className="toast">Your code: <strong>{toastCode}</strong></div>}
      <form className="auth-card" onSubmit={onSubmit}>
        <div className="auth-brand">
          <span className="brand-mark">W</span>
          <h1>Wealfull CRM</h1>
          <p>Confirm your email</p>
        </div>
        <label className="otp-label">
          Confirmation code
          <span className="otp-sent-to">Code sent to {email}</span>
          <div className="otp-row">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => (refs.current[i] = el)}
                className="otp-input"
                inputMode="numeric"
                maxLength={1}
                value={d}
                disabled={expired}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
                onPaste={onPaste}
              />
            ))}
          </div>
        </label>
        <div className="otp-timer">
          {expired ? (
            <>
              Code expired.{' '}
              <SpinnerButton type="button" className="resend-btn" onClick={resend} loading={resending}>
                {resending ? 'Sending…' : 'Resend code'}
              </SpinnerButton>
            </>
          ) : resendRemaining > 0 ? (
            <>
              Resend available in {Math.floor(resendRemaining / 60)}:
              {String(resendRemaining % 60).padStart(2, '0')}
            </>
          ) : (
            <SpinnerButton type="button" className="resend-btn" onClick={resend} loading={resending}>
              {resending ? 'Sending…' : 'Resend code'}
            </SpinnerButton>
          )}
        </div>
        {error && <div className="alert">{error}</div>}
        <SpinnerButton type="submit" loading={loading} disabled={expired}>
          {loading ? 'Confirming…' : 'Confirm'}
        </SpinnerButton>
        <p className="hint">
          <Link to={backTo}>{mode === 'login' ? 'Back to sign in' : 'Back to registration'}</Link>
        </p>
      </form>
    </div>
  )
}