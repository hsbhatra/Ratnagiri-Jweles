import { matchedData } from 'express-validator'
import { sendSuccess } from '../middleware/errorHandler.js'
import * as auth from '../services/auth.service.js'
import {
  listActiveSessions,
  revokeAllUserSessions,
  revokeSessions,
  revokeUserSession,
  rotateRefreshToken,
} from '../services/session.service.js'
import { REFRESH_COOKIE, clearAuthCookies, setAuthCookies } from '../services/token.service.js'

const clientInfo = (req) => ({ userAgent: req.get('user-agent') || '', ip: req.ip })

export async function register(req, res) {
  const result = await auth.register(matchedData(req))
  sendSuccess(res, result, undefined, 201)
}

export async function resendOtp(req, res) {
  sendSuccess(res, await auth.resendRegistrationOtp(matchedData(req)))
}

export async function verifyRegistration(req, res) {
  const { user, session, accessToken, refreshToken } = await auth.verifyRegistration({
    ...matchedData(req),
    ...clientInfo(req),
  })
  setAuthCookies(res, { accessToken, refreshToken })
  sendSuccess(res, { user, session: session.toPublic(session._id) })
}

export async function login(req, res) {
  const { user, session, accessToken, refreshToken } = await auth.login({ ...matchedData(req), ...clientInfo(req) })
  setAuthCookies(res, { accessToken, refreshToken })
  sendSuccess(res, { user, session: session.toPublic(session._id) })
}

export async function refresh(req, res) {
  try {
    const { accessToken, refreshToken } = await rotateRefreshToken(req.cookies?.[REFRESH_COOKIE])
    setAuthCookies(res, { accessToken, refreshToken })
    sendSuccess(res, { refreshed: true })
  } catch (err) {
    clearAuthCookies(res)
    throw err
  }
}

/** FR2.4: single-device logout — invalidates the server-side session, not just the cookie. */
export async function logout(req, res) {
  await revokeSessions({ _id: req.authSession._id }, 'logout')
  clearAuthCookies(res)
  sendSuccess(res, { loggedOut: true })
}

export async function logoutAll(req, res) {
  await revokeAllUserSessions(req.user._id, 'logout_all')
  clearAuthCookies(res)
  sendSuccess(res, { loggedOut: true })
}

export async function me(req, res) {
  sendSuccess(res, { user: req.user, session: req.authSession.toPublic(req.authSession._id) })
}

export async function listSessions(req, res) {
  const sessions = await listActiveSessions(req.user._id)
  sendSuccess(res, { sessions: sessions.map((s) => s.toPublic(req.authSession._id)) })
}

export async function revokeSession(req, res) {
  const { id } = matchedData(req)
  await revokeUserSession({ userId: req.user._id, sessionId: id })
  if (req.authSession._id.equals(id)) clearAuthCookies(res)
  sendSuccess(res, { revoked: true })
}

export async function forgotPassword(req, res) {
  sendSuccess(res, await auth.forgotPassword(matchedData(req)))
}

export async function resetPassword(req, res) {
  await auth.resetPassword(matchedData(req))
  clearAuthCookies(res)
  sendSuccess(res, { reset: true })
}

export async function changePassword(req, res) {
  await auth.changePassword({ ...matchedData(req), userId: req.user._id, currentSessionId: req.authSession._id })
  sendSuccess(res, { changed: true })
}
