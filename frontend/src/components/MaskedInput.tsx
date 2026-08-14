import { HTMLProps } from 'react'

interface MaskedInputProps extends Omit<HTMLProps<HTMLInputElement>, 'value' | 'onChange'> {
  value: string
  mask: (raw: string) => string
  onChange: (masked: string) => void
}

export default function MaskedInput({ value, mask, onChange, ...rest }: MaskedInputProps) {
  return (
    <input
      {...rest}
      value={value}
      onChange={(e) => onChange(mask(e.target.value))}
    />
  )
}