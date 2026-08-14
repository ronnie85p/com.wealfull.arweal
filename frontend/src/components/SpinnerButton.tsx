import { ButtonHTMLAttributes, ReactNode } from 'react'

interface SpinnerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading: boolean
  children: ReactNode
}

export default function SpinnerButton({ loading, children, disabled, ...props }: SpinnerButtonProps) {
  return (
    <button {...props} disabled={loading || disabled}>
      {loading && <span className="btn-spinner" />}
      {children}
    </button>
  )
}