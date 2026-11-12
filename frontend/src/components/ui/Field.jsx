import { useId, useState } from 'react'

export const inputClass =
  'h-12 w-full rounded-none border border-line bg-field px-4 text-[15px] text-ink ' +
  'placeholder:text-muted transition-colors focus:border-ink focus:outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-gold/70 aria-[invalid=true]:border-danger/70'

/** Labelled input with hint + error wired up for screen readers. */
export default function Field({ label, error, hint, className = '', children, ...inputProps }) {
  const id = useId()
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      {children ? (
        children({ id, describedBy, invalid: Boolean(error) })
      ) : (
        <input id={id} aria-invalid={Boolean(error)} aria-describedby={describedBy} className={inputClass} {...inputProps} />
      )}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-[13px] text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-[13px] text-danger">
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
            className="absolute inset-y-0 right-0 rounded-none px-4 text-[13px] font-medium text-gold hover:text-ink focus-visible:outline-2 focus-visible:outline-gold"
            aria-pressed={visible}
          >
            {visible ? 'Hide' : 'Show'}
          </button>
        </div>
      )}
    </Field>
  )
}
