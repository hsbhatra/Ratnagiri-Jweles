const variants = {
  primary:
    'bg-brand-forest-900 text-brand-linen-100 hover:bg-brand-forest-800 disabled:bg-brand-forest-900/50',
  outline:
    'border border-brand-forest-900/30 text-brand-forest-900 hover:border-brand-forest-900 hover:bg-brand-forest-900/5',
  danger: 'border border-red-800/40 text-red-800 hover:border-red-800 hover:bg-red-800/5',
}

export default function Button({ variant = 'primary', loading = false, className = '', children, disabled, ...props }) {
  return (
    <button
      className={`inline-flex h-12 items-center justify-center gap-2 rounded-full px-7 text-[15px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold-500 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
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
      ? 'border-red-800/20 bg-red-50 text-red-900'
      : 'border-brand-forest-800/20 bg-brand-forest-900/5 text-brand-forest-900'
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-[10px] border px-4 py-3 text-sm ${styles}`}>
      {children}
    </div>
  )
}
