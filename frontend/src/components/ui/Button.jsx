const variants = {
  primary:
    'bg-action text-on-action hover:bg-action/85 disabled:opacity-50',
  outline:
    'border border-ink/50 text-ink hover:border-ink hover:bg-ink/5',
  danger: 'border border-danger/40 text-danger hover:border-danger hover:bg-danger/10',
}

/** Same look for links that act as buttons: <Link className={buttonClass()} /> */
export const buttonClass = (variant = 'primary', className = '') =>
  `inline-flex h-12 items-center justify-center gap-2 rounded-none px-7 text-[15px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold active:translate-y-px disabled:cursor-not-allowed ${variants[variant]} ${className}`

export default function Button({ variant = 'primary', loading = false, className = '', children, disabled, ...props }) {
  return (
    <button
      className={buttonClass(variant, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />
      )}
      {children}
    </button>
  )
}

export function FormMessage({ tone = 'error', children }) {
  if (!children) return null
  const styles =
    tone === 'error'
      ? 'border-danger/20 bg-danger/10 text-danger'
      : 'border-ink/20 bg-ink/5 text-ink'
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-none border px-4 py-3 text-sm ${styles}`}>
      {children}
    </div>
  )
}
