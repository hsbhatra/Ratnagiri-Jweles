import mongoose from 'mongoose'
import { env } from '../config/env.js'
import Session from '../models/Session.js'
import AppError from '../utils/AppError.js'
import deviceLabel from '../utils/deviceLabel.js'
import {
  createRefreshToken,
  hashRefreshToken,
  parseRefreshToken,
  safeEqualHex,
  signAccessToken,
} from './token.service.js'

const activeFilter = (userId) => ({ userId, isActive: true, expiresAt: { $gt: new Date() } })

export function listActiveSessions(userId) {
  return Session.find(activeFilter(userId)).sort({ lastUsedAt: -1 })
}

export function countActiveSessions(userId) {
  return Session.countDocuments(activeFilter(userId))
}

function sessionLimitError(sessions) {
  return new AppError(
    409,
    `You're signed in on ${env.maxActiveSessions} devices already. Sign out of one to continue.`,
    'SESSION_LIMIT',
    { sessions: sessions.map((s) => s.toPublic()) }
  )
}

/**
 * Creates a session if the user is under the cap (NFR-S3 / SEC-04).
 * The cap is enforced again *after* insert, so two simultaneous logins can't both
 * slip past the pre-check and leave the user with 3 sessions.
 */
export async function createSession({ user, userAgent, ip }) {
  const existing = await listActiveSessions(user._id)
  if (existing.length >= env.maxActiveSessions) throw sessionLimitError(existing)

  const sessionId = new mongoose.Types.ObjectId()
  const { token: refreshToken, hash } = createRefreshToken(sessionId.toString())
  const now = new Date()
  const session = await Session.create({
    _id: sessionId,
    userId: user._id,
    refreshTokenHash: hash,
    userAgent: userAgent?.slice(0, 500),
    deviceLabel: deviceLabel(userAgent),
    ip,
    createdAt: now,
    lastUsedAt: now,
    expiresAt: new Date(now.getTime() + env.refreshTokenTtlSec * 1000),
  })

  // Post-insert recheck: if we overshot, back this one out. Count-based (not "am I among
  // the oldest N") so a winner is never revoked — at worst two racing logins both lose
  // and the user simply retries, but the cap can never be exceeded.
  if ((await countActiveSessions(user._id)) > env.maxActiveSessions) {
    await revokeSessions({ _id: sessionId }, 'session_limit_race')
    throw sessionLimitError(await listActiveSessions(user._id))
  }

  return {
    session,
    accessToken: signAccessToken({ userId: user._id.toString(), sessionId: sessionId.toString() }),
    refreshToken,
  }
}

export function revokeSessions(filter, reason) {
  return Session.updateMany(
    { ...filter, isActive: true },
    { $set: { isActive: false, revokedAt: new Date(), revokedReason: reason } }
  )
}

export async function revokeUserSession({ userId, sessionId, reason = 'user_revoked' }) {
  if (!mongoose.isValidObjectId(sessionId)) throw new AppError(404, 'Session not found', 'SESSION_NOT_FOUND')
  // userId in the filter = a user can only ever revoke their own sessions (SEC-11)
  const result = await revokeSessions({ _id: sessionId, userId }, reason)
  if (result.modifiedCount === 0) throw new AppError(404, 'Session not found', 'SESSION_NOT_FOUND')
}

export function revokeAllUserSessions(userId, reason) {
  return revokeSessions({ userId }, reason)
}

/**
 * Architecture §5.3: rotate on every refresh. Presenting a refresh token that has
 * already been rotated = theft signal → revoke every session for that user (SEC-05).
 */
export async function rotateRefreshToken(rawToken) {
  const parsed = parseRefreshToken(rawToken)
  if (!parsed) throw new AppError(401, 'Please sign in again.', 'REFRESH_INVALID')

  const session = await Session.findById(parsed.sessionId)
  if (!session || !session.isActive || session.expiresAt <= new Date()) {
    throw new AppError(401, 'Your session has ended. Please sign in again.', 'SESSION_ENDED')
  }

  if (!safeEqualHex(session.refreshTokenHash, hashRefreshToken(rawToken))) {
    await revokeAllUserSessions(session.userId, 'token_reuse')
    console.warn(`[security] Refresh token reuse detected for user ${session.userId}; all sessions revoked`)
    throw new AppError(401, 'For your security, please sign in again.', 'REFRESH_REUSED')
  }

  const { token: refreshToken, hash } = createRefreshToken(session._id.toString())
  // Conditional update guards against two parallel refreshes both "winning".
  const updated = await Session.findOneAndUpdate(
    { _id: session._id, refreshTokenHash: session.refreshTokenHash, isActive: true },
    { $set: { refreshTokenHash: hash, lastUsedAt: new Date() } },
    { returnDocument: 'after' }
  )
  if (!updated) throw new AppError(401, 'Please sign in again.', 'REFRESH_INVALID')

  return {
    session: updated,
    accessToken: signAccessToken({ userId: updated.userId.toString(), sessionId: updated._id.toString() }),
    refreshToken,
  }
}
