import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

export const ACCESS_COOKIE = 'rg_access'
export const REFRESH_COOKIE = 'rg_refresh'
const REFRESH_COOKIE_PATH = '/api/v1/auth'

export function signAccessToken({ userId, sessionId }) {
  return jwt.sign({ sid: sessionId }, env.jwtAccessSecret, {
    subject: userId,
    expiresIn: env.accessTokenTtlSec,
    algorithm: 'HS256',
  })
}

/** Returns the payload, or null for any invalid/expired token. */
export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, env.jwtAccessSecret, { algorithms: ['HS256'] })
  } catch {
    return null
  }
}

/**
 * Opaque refresh token: "<sessionId>.<random>". Only its SHA-256 is stored; the
 * session id prefix lets us find the row and detect reuse of a rotated token.
 */
export function createRefreshToken(sessionId) {
  const secret = crypto.randomBytes(32).toString('base64url')
  const token = `${sessionId}.${secret}`
  return { token, hash: hashRefreshToken(token) }
}

export function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function parseRefreshToken(token) {
  if (typeof token !== 'string') return null
  const [sessionId, secret] = token.split('.')
  if (!/^[a-f0-9]{24}$/.test(sessionId || '') || !secret) return null
  return { sessionId }
}

export function safeEqualHex(a, b) {
  const x = Buffer.from(a, 'hex')
  const y = Buffer.from(b, 'hex')
  return x.length === y.length && crypto.timingSafeEqual(x, y)
}

function baseCookie() {
  return { httpOnly: true, secure: env.isProd || env.cookieSameSite === 'none', sameSite: env.cookieSameSite }
}

export function setAuthCookies(res, { accessToken, refreshToken }) {
  res.cookie(ACCESS_COOKIE, accessToken, { ...baseCookie(), path: '/', maxAge: env.accessTokenTtlSec * 1000 })
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...baseCookie(),
    path: REFRESH_COOKIE_PATH,
    maxAge: env.refreshTokenTtlSec * 1000,
  })
}

export function clearAuthCookies(res) {
  res.clearCookie(ACCESS_COOKIE, { ...baseCookie(), path: '/' })
  res.clearCookie(REFRESH_COOKIE, { ...baseCookie(), path: REFRESH_COOKIE_PATH })
}
