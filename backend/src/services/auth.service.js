import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { env } from '../config/env.js'
import User from '../models/User.js'
import AppError from '../utils/AppError.js'
import { issueOtp, verifyOtp } from './otp.service.js'
import { createSession, revokeAllUserSessions, revokeUserSession } from './session.service.js'

// Used to keep "unknown email" and "wrong password" equally slow (no user enumeration by timing).
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser-not-a-real-password', env.bcryptCost)

const normaliseEmail = (email) => String(email).trim().toLowerCase()
const normalisePhone = (phone) => (phone ? String(phone).replace(/[\s()-]/g, '') : undefined)
const sha256 = (v) => crypto.createHash('sha256').update(String(v)).digest('hex')

function newRegistrationToken() {
  const token = crypto.randomBytes(24).toString('base64url')
  return { token, hash: sha256(token) }
}

/**
 * The registration token binds "who set the password" to "who verifies". Without it,
 * someone could re-register a victim's pending email with their own password, wait for
 * the victim to verify the emailed code, and then know the password of a live account.
 */
function assertRegistrationToken(user, token) {
  const expected = user?.registrationTokenHash
  const ok =
    expected && typeof token === 'string' && token.length > 0 &&
    crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sha256(token), 'hex'))
  if (!ok) {
    throw new AppError(
      400,
      'This verification link has expired. Please register again to get a new code.',
      'REGISTRATION_EXPIRED'
    )
  }
}

/**
 * FR2.1 (adapted for v1: email OTP only, phone collected unverified).
 * Re-registering a still-unverified email updates the pending record and re-sends the
 * code, so a typo'd or abandoned signup never permanently blocks that address.
 */
export async function register({ name, email, phone, password }) {
  email = normaliseEmail(email)
  const passwordHash = await bcrypt.hash(password, env.bcryptCost)

  let user = await User.findOne({ email })
  if (user && user.status !== 'pending_verification') {
    throw new AppError(409, 'An account with this email already exists. Try signing in instead.', 'EMAIL_TAKEN')
  }

  // Send the code first: if it's refused (e.g. resend cooldown) the pending record and
  // the earlier registrant's token stay untouched.
  const otp = await issueOtp({ target: email, purpose: 'registration', name })

  const registration = newRegistrationToken()
  const fields = { name, phone: normalisePhone(phone), passwordHash, registrationTokenHash: registration.hash }
  if (user) {
    Object.assign(user, fields)
    await user.save()
  } else {
    user = await User.create({ email, ...fields })
  }

  return { email, registrationToken: registration.token, ...otp }
}

export async function resendRegistrationOtp({ email, registrationToken }) {
  email = normaliseEmail(email)
  const user = await User.findOne({ email, status: 'pending_verification' }).select('+registrationTokenHash')
  assertRegistrationToken(user, registrationToken)
  const otp = await issueOtp({ target: email, purpose: 'registration', name: user.name })
  return { email, ...otp }
}

/** Verifies the email OTP, activates the account and signs the user straight in. */
export async function verifyRegistration({ email, code, registrationToken, userAgent, ip }) {
  email = normaliseEmail(email)
  const user = await User.findOne({ email }).select('+registrationTokenHash')
  if (user?.status === 'active') throw new AppError(409, 'This email is already verified. Please sign in.', 'ALREADY_VERIFIED')
  assertRegistrationToken(user, registrationToken)

  await verifyOtp({ target: email, purpose: 'registration', code })

  user.status = 'active'
  user.emailVerifiedAt = new Date()
  user.registrationTokenHash = undefined
  await user.save()

  const tokens = await createSession({ user, userAgent, ip })
  return { user, ...tokens }
}

/**
 * FR2.2 + FR2.3 / Architecture §5.2. Email + password in v1 (phone login returns once
 * phone numbers are verified). At the device cap, a SESSION_LIMIT 409 lists the active
 * sessions; the client retries with `revokeSessionId` — the password is re-checked in
 * that same request, so revoking never needs a separate, unauthenticated endpoint.
 */
export async function login({ email, password, revokeSessionId, userAgent, ip }) {
  email = normaliseEmail(email)
  const user = await User.findOne({ email }).select('+passwordHash')

  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH)
  if (!user || !ok) throw new AppError(401, 'Incorrect email or password.', 'INVALID_CREDENTIALS')

  if (user.status === 'pending_verification') {
    throw new AppError(403, 'Please verify your email before signing in.', 'ACCOUNT_NOT_VERIFIED', { email })
  }
  if (user.status !== 'active') {
    throw new AppError(403, 'This account is unavailable. Please contact support.', 'ACCOUNT_SUSPENDED')
  }

  if (revokeSessionId) {
    await revokeUserSession({ userId: user._id, sessionId: revokeSessionId, reason: 'user_revoked' })
  }

  const tokens = await createSession({ user, userAgent, ip })
  return { user, ...tokens }
}

/** FR2.5 via email. Always answers the same way so it can't be used to probe for accounts. */
export async function forgotPassword({ email }) {
  email = normaliseEmail(email)
  const user = await User.findOne({ email, status: 'active' })
  if (user) {
    try {
      await issueOtp({ target: email, purpose: 'password_reset', name: user.name })
    } catch (err) {
      // A cooldown only exists for real accounts, so answering differently would leak
      // that the email is registered. The previous code is still valid anyway.
      if (err.code !== 'OTP_COOLDOWN') throw err
    }
  }
  return { email, expiresInSec: env.otpTtlSec, resendAfterSec: env.otpResendCooldownSec }
}

/** Architecture §5.4: new password only after OTP; every existing session is signed out. */
export async function resetPassword({ email, code, newPassword }) {
  email = normaliseEmail(email)
  const user = await User.findOne({ email, status: 'active' }).select('+passwordHash')
  if (!user) throw new AppError(400, 'This code has expired or was never sent. Please request a new one.', 'OTP_EXPIRED')

  await verifyOtp({ target: email, purpose: 'password_reset', code })

  user.passwordHash = await bcrypt.hash(newPassword, env.bcryptCost)
  user.passwordChangedAt = new Date()
  await user.save()
  await revokeAllUserSessions(user._id, 'password_reset')
}
