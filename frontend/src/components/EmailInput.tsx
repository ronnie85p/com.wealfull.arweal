import MaskedInput from './MaskedInput'

export function maskEmail(raw: string) {
  return raw.replace(/\s+/g, '').toLowerCase()
}

interface EmailInputProps {
  value: string
  onChange: (masked: string) => void
  [key: string]: unknown
}

export default function EmailInput({ value, onChange, ...rest }: EmailInputProps) {
  return (
    <MaskedInput
      {...rest}
      type="email"
      inputMode="email"
      autoComplete="email"
      placeholder="you@example.com"
      value={value}
      mask={maskEmail}
      onChange={onChange}
    />
  )
}