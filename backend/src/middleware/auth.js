import mongoose from 'mongoose'
import Session from '../models/Session.js'
import User from '../models/User.js'
import AppError from '../utils/AppError.js'
import { ACCESS_COOKIE, verifyAccessToken } from '../services/token.service.js'

/**
 * Architecture §5.5 / NFR-S0: the JWT only says *which* session is claimed. The session
 * row and the user (with their current role/status) are re-read from the database on
 * every request, so logout, revocation, password reset or a role change apply instantly.
 */
export async function authenticate(req, res, next) {
  const token = req.cookies?.[ACCESS_COOKIE]
  const payload = token ? verifyAccessToken(token) : null
  if (!payload || !mongoose.isValidObjectId(payload.sid) || !mongoose.isValidObjectId(payload.sub)) {
    return next(new AppError(401, 'Please sign in to continue.', 'UNAUTHENTICATED'))
  }

  const session = await Session.findOne({
    _id: payload.sid,
    userId: payload.sub,
    isActive: true,
    expiresAt: { $gt: new Date() },
  })
  if (!session) return next(new AppError(401, 'Your session has ended. Please sign in again.', 'SESSION_ENDED'))

  const user = await User.findById(payload.sub)
  if (!user || user.status !== 'active') {
    return next(new AppError(401, 'Please sign in to continue.', 'UNAUTHENTICATED'))
  }

  req.user = user
  req.authSession = session
  next()
}

/** NFR-S10 / SEC-09: role checked from the DB-loaded user, never from the token. */
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new AppError(401, 'Please sign in to continue.', 'UNAUTHENTICATED'))
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, "You don't have permission to do that.", 'FORBIDDEN'))
    }
    next()
  }
}
