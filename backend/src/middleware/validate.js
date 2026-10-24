import { validationResult } from 'express-validator'
import AppError from '../utils/AppError.js'

/** Runs after express-validator chains; returns 422 with per-field messages. */
export default function validate(req, res, next) {
  const result = validationResult(req)
  if (result.isEmpty()) return next()
  const fields = {}
  for (const err of result.array()) {
    if (err.type === 'field' && !fields[err.path]) fields[err.path] = err.msg
  }
  next(new AppError(422, 'Please check the highlighted fields', 'VALIDATION_ERROR', { fields }))
}
