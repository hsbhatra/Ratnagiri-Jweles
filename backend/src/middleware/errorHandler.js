import { env } from '../config/env.js'

/** Standard response envelope the frontend's apiClient expects. */
export function sendSuccess(res, data, meta = undefined, status = 200) {
  return res.status(status).json({ success: true, data, meta })
}

export function sendError(res, status, message, code = undefined, details = undefined) {
  return res.status(status).json({ success: false, error: { message, code, details } })
}

// NFR-R3: structured JSON errors, never leak stack traces in production
export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // Malformed JSON bodies from express.json()
  if (err.type === 'entity.parse.failed') {
    return sendError(res, 400, 'Malformed JSON body', 'BAD_JSON')
  }

  const status = err.status || err.statusCode || 500
  if (status >= 500) console.error(err)

  if (err.expose || status < 500) {
    return sendError(res, status, err.message, err.code, err.details)
  }
  const details = env.isProd ? undefined : err.stack
  return sendError(res, 500, 'Internal server error', 'INTERNAL', details)
}

export function notFoundHandler(req, res) {
  sendError(res, 404, `Route not found: ${req.method} ${req.originalUrl}`, 'NOT_FOUND')
}
