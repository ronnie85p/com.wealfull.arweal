import { useEffect, useRef } from 'react'
import IMask from 'imask'

interface MoneyInputProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

export default function MoneyInput({ value, onChange, placeholder = '0.00' }: MoneyInputProps) {
  const ref = useRef<HTMLInputElement>(null)
  const maskRef = useRef<ReturnType<typeof IMask> | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const mask = IMask(el, {
      mask: Number,
      thousandsSeparator: ',',
      radix: '.',
      scale: 2,
      min: 0,
      normalizeZeros: true,
      padFractionalZeros: true,
      lazy: false,
    })
    maskRef.current = mask
    mask.on('accept', () => onChangeRef.current(mask.value))
    return () => mask.destroy()
  }, [])

  useEffect(() => {
    const mask = maskRef.current
    if (mask && document.activeElement !== ref.current) mask.value = value
  }, [value])

  return (
    <div className="input-prefix">
      <span>$</span>
      <input ref={ref} type="text" inputMode="decimal" placeholder={placeholder} />
    </div>
  )
}
