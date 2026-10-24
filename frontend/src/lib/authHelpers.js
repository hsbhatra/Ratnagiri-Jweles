/** Pull `{ message, code, fields }` out of the backend error envelope. */
export function readError(payload) {
  const error = payload?.error || {}
  return {
    message: error.message || 'Something went wrong. Please try again.',
    code: error.code,
    fields: error.details?.fields || {},
    details: error.details || {},
  }
}

// Pending signup survives a refresh on the verify page; cleared once verified.
const PENDING_KEY = 'rg_pending_registration'

export const pendingRegistration = {
  get() {
    try {
      return JSON.parse(sessionStorage.getItem(PENDING_KEY)) || null
    } catch {
      return null
    }
  },
  set(value) {
    try {
      sessionStorage.setItem(PENDING_KEY, JSON.stringify(value))
    } catch {
      // storage blocked (private mode) — the in-memory router state still carries it
    }
  },
  clear() {
    try {
      sessionStorage.removeItem(PENDING_KEY)
    } catch {
      /* ignore */
    }
  },
}

/** Only allow same-site relative redirects after sign-in (no open redirects). */
export function safeRedirect(path) {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') ? path : '/account'
}
