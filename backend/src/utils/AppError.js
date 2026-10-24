/**
 * Operational error with an HTTP status and a stable machine-readable `code`
 * the frontend can branch on (e.g. SESSION_LIMIT, ACCOUNT_NOT_VERIFIED).
 */
export default class AppError extends Error {
  constructor(status, message, code = undefined, details = undefined) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
    this.expose = true
  }
}
