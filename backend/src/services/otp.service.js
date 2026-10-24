import crypto from 'node:crypto'
import { env } from '../config/env.js'
import AppError from '../utils/AppError.js'
import { otpStore } from './otpStore.js'
import { sendOtpEmail } from './email.service.js'

/**
 * NFR-S6: OTPs are generated + validated server-side, stored only as a keyed hash,
 * expire after env.otpTtlSec, allow env.otpMaxAttempts wrong guesses, and can't be
 * re-sent more than once per env.otpResendCooldownSec per address.
 */
export const OTP_PURPOSES = ['registration', 'password_reset']

const codeKey = (purpose, target) => `otp:${purpose}:${target}`
const cooldownKey = (purpose, target) => `otp-cd:${purpose}:${target}`

const hashCode = (code) => crypto.createHmac('sha256', env.otpHashSecret).update(code).digest('hex')

function generateCode() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0')
}

export async function issueOtp({ target, purpose, name }) {
  const cooldown = await otpStore.ttl(cooldownKey(purpose, target))
  if (cooldown > 0) {
    throw new AppError(
      429,
      `Please wait ${cooldown}s before requesting another code.`,
      'OTP_COOLDOWN',
      { retryAfterSec: cooldown }
    )
  }

  const code = generateCode()
  // A new code always replaces the previous one and resets the attempt counter.
  await otpStore.set(
    codeKey(purpose, target),
    JSON.stringify({ codeHash: hashCode(code), attempts: 0 }),
    env.otpTtlSec
  )
  await otpStore.set(cooldownKey(purpose, target), '1', env.otpResendCooldownSec)

  try {
    await sendOtpEmail({ to: target, name, code, purpose, ttlMin: Math.round(env.otpTtlSec / 60) })
  } catch (err) {
    // Don't leave the user locked behind a cooldown for a code that never arrived
    await otpStore.del(codeKey(purpose, target))
    await otpStore.del(cooldownKey(purpose, target))
    console.error(err)
    throw new AppError(502, "We couldn't send the email right now. Please try again shortly.", 'EMAIL_SEND_FAILED')
  }
  return { expiresInSec: env.otpTtlSec, resendAfterSec: env.otpResendCooldownSec }
}

/** Throws AppError on any failure; on success the code is consumed (single use). */
export async function verifyOtp({ target, purpose, code }) {
  const key = codeKey(purpose, target)
  const raw = await otpStore.get(key)
  if (!raw) {
    throw new AppError(400, 'This code has expired or was never sent. Please request a new one.', 'OTP_EXPIRED')
  }

  const record = JSON.parse(raw)
  if (record.attempts >= env.otpMaxAttempts) {
    await otpStore.del(key)
    throw new AppError(429, 'Too many wrong attempts. Please request a new code.', 'OTP_LOCKED')
  }

  const expected = Buffer.from(record.codeHash, 'hex')
  const actual = Buffer.from(hashCode(String(code)), 'hex')
  const match = expected.length === actual.length && crypto.timingSafeEqual(expected, actual)

  if (!match) {
    record.attempts += 1
    const remaining = env.otpMaxAttempts - record.attempts
    if (remaining <= 0) {
      await otpStore.del(key)
      throw new AppError(429, 'Too many wrong attempts. Please request a new code.', 'OTP_LOCKED')
    }
    await otpStore.setKeepTtl(key, JSON.stringify(record))
    throw new AppError(400, `That code isn't right. ${remaining} attempt(s) left.`, 'OTP_INVALID', {
      attemptsLeft: remaining,
    })
  }

  await otpStore.del(key)
  return true
}
