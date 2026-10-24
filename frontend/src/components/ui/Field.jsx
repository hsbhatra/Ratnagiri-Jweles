import { useId, useState } from 'react'

export const inputClass =
  'h-12 w-full rounded-[10px] border border-brand-forest-900/20 bg-white/70 px-4 text-[15px] text-brand-forest-950 ' +
  'placeholder:text-brand-forest-900/40 transition-colors focus:border-brand-forest-800 focus:outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-brand-gold-500/70 aria-[invalid=true]:border-red-700/70'

/** Labelled input with hint + error wired up for screen readers. */
export default function Field({ label, error, hint, className = '', children, ...inputProps }) {
  const id = useId()
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-brand-forest-900">
        {label}
      </label>
      {children ? (
        children({ id, describedBy, invalid: Boolean(error) })
      ) : (
        <input id={id} aria-invalid={Boolean(error)} aria-describedby={describedBy} className={inputClass} {...inputProps} />
      )}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-[13px] text-brand-forest-900/60">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-[13px] text-red-800">
          {error}
        </p>
      )}
    </div>
  )
}

export function PasswordField({ label = 'Password', error, hint, ...inputProps }) {
  const [visible, setVisible] = useState(false)
  return (
    <Field label={label} error={error} hint={hint}>
      {({ id, describedBy, invalid }) => (
        <div className="relative">
          <input
            id={id}
            type={visible ? 'text' : 'password'}
            aria-invalid={invalid}
            aria-describedby={describedBy}
            className={`${inputClass} pr-20`}
            {...inputProps}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute inset-y-0 right-0 rounded-r-[10px] px-4 text-[13px] font-medium text-brand-forest-800 hover:text-brand-forest-950 focus-visible:outline-2 focus-visible:outline-brand-gold-500"
            aria-pressed={visible}
          >
            {visible ? 'Hide' : 'Show'}
          </button>
        </div>
      )}
    </Field>
  )
}
