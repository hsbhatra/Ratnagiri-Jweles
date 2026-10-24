import AppError from '../utils/AppError.js'

/**
 * NFR-S7 / SEC-06: reject operator-injection payloads like { email: { "$ne": null } }.
 * express-mongo-sanitize is incompatible with Express 5 (read-only req.query), so this
 * small guard rejects any body/params key starting with "$" or containing "." outright.
 */
function hasDangerousKey(value, depth = 0) {
  if (depth > 10 || value === null || typeof value !== 'object') return false
  return Object.keys(value).some(
    (key) => key.startsWith('$') || key.includes('.') || hasDangerousKey(value[key], depth + 1)
  )
}

export default function rejectMongoOperators(req, res, next) {
  if (hasDangerousKey(req.body) || hasDangerousKey(req.params) || hasDangerousKey(req.query)) {
    return next(new AppError(400, 'Invalid characters in request', 'INVALID_INPUT'))
  }
  next()
}
