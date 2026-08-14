import MaskedInput from './MaskedInput'

export function maskPhone(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 10)
  if (digits.length === 0) return ''
  const area = digits.slice(0, 3)
  const mid = digits.slice(3, 6)
  const last = digits.slice(6, 10)
  let out = `(${area}`
  if (mid) out += `) ${mid}`
  if (last) out += `-${last}`
  return out
}

interface PhoneInputProps {
  value: string
  onChange: (masked: string) => void
  [key: string]: unknown
}

export default function PhoneInput({ value, onChange, ...rest }: PhoneInputProps) {
  return (
    <MaskedInput
      {...rest}
      className={rest.className ? `${rest.className} placeholder-focus` : 'placeholder-focus'}
      type="tel"
      inputMode="tel"
      placeholder="(___) ___-____"
      value={value}
      mask={maskPhone}
      onChange={onChange}
    />
  )
}