import { useRef } from 'react'

const LENGTH = 6

/**
 * Six single-digit boxes that behave like one field: typing advances, backspace goes
 * back, and pasting (or the phone's one-time-code autofill) fills every box at once.
 */
export default function OtpInput({ value, onChange, invalid = false, disabled = false, labelId }) {
  const refs = useRef([])
  const digits = Array.from({ length: LENGTH }, (_, i) => value[i] || '')

  const setAt = (index, digit) => {
    const next = digits.slice()
    next[index] = digit
    onChange(next.join('').slice(0, LENGTH))
  }

  const fill = (text, from = 0) => {
    const clean = text.replace(/\D/g, '').slice(0, LENGTH - from)
    if (!clean) return
    const next = digits.slice()
    clean.split('').forEach((d, i) => {
      next[from + i] = d
    })
    onChange(next.join(''))
    refs.current[Math.min(from + clean.length, LENGTH - 1)]?.focus()
  }

  return (
    <div role="group" aria-labelledby={labelId} className="flex gap-2 sm:gap-3">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          value={digit}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={i === 0 ? LENGTH : 1}
          disabled={disabled}
          aria-label={`Digit ${i + 1} of ${LENGTH}`}
          aria-invalid={invalid}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '')
            if (v.length > 1) return fill(v, i) // autofill / paste into a box
            setAt(i, v)
            if (v && i < LENGTH - 1) refs.current[i + 1]?.focus()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !digit && i > 0) refs.current[i - 1]?.focus()
            if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus()
            if (e.key === 'ArrowRight' && i < LENGTH - 1) refs.current[i + 1]?.focus()
          }}
          onPaste={(e) => {
            e.preventDefault()
            fill(e.clipboardData.getData('text'), i)
          }}
          onFocus={(e) => e.target.select()}
          className={`h-14 w-full min-w-0 rounded-[10px] border bg-white/70 text-center font-display text-3xl text-brand-forest-950 transition-colors focus:border-brand-forest-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-500/70 sm:h-16 ${
            invalid ? 'border-red-700/70' : 'border-brand-forest-900/20'
          }`}
        />
      ))}
    </div>
  )
}
