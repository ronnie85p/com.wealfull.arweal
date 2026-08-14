import MaskedInput from './MaskedInput'

export const EIN_LENGTH = 9

export function maskEin(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, EIN_LENGTH)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}-${digits.slice(2)}`
}

interface EinInputProps {
  value: string
  onChange: (masked: string) => void
  [key: string]: unknown
}

export default function EinInput({ value, onChange, ...rest }: EinInputProps) {
  return (
    <MaskedInput
      {...rest}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      maxLength={10}
      placeholder="12-3456789"
      value={value}
      mask={maskEin}
      onChange={onChange}
    />
  )
}