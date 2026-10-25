import rateLimit, { ipKeyGenerator } from 'express-rate-limit'
import { env } from '../config/env.js'
import { sendError } from './errorHandler.js'

// NFR-S8: stricter limits on auth / OTP endpoints. Skipped in tests unless a test opts in.
const skip = () => env.isTest && !process.env.TEST_RATE_LIMIT

function make({ windowMin, limit, message, keyGenerator, skipSuccessfulRequests = false }) {
  return rateLimit({
    windowMs: windowMin * 60 * 1000,
    limit,
    skipSuccessfulRequests,
    ...(keyGenerator && { keyGenerator }),
    standardHeaders: true,
    legacyHeaders: false,
    skip,
    handler: (req, res) => sendError(res, 429, message, 'RATE_LIMITED'),
  })
}

// Brute-force guard per account *and* IP (10 tries / 15 min), plus a looser per-IP cap so
// one person's typos don't lock out everyone behind the same carrier-NAT address.
const loginAccountLimiter = make({
  windowMin: 15,
  limit: 10,
  message: 'Too many login attempts. Please wait a few minutes and try again.',
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${String(req.body?.email ?? '').trim().toLowerCase()}`,
  skipSuccessfulRequests: true, // only failed attempts count towards locking an account
})
const loginIpLimiter = make({
  windowMin: 15,
  limit: 60,
  message: 'Too many login attempts. Please wait a few minutes and try again.',
})
export const loginLimiter = [loginIpLimiter, loginAccountLimiter]

// SEC-08: per-IP ceiling on code-sending endpoints. Kept roomy because many Indian
// mobile users share one IP (carrier NAT); the per-email 60s cooldown in otp.service
// is what stops anyone hammering a single inbox.
const otpSendBurstLimiter = make({
  windowMin: 15,
  limit: 20,
  message: 'Too many code requests. Please wait a few minutes before asking for another.',
})
// Daily ceiling per IP, so one source can't burn the email provider's daily quota
// (Brevo free: 300/day) and block sign-ups for everyone else.
const otpSendDailyLimiter = make({
  windowMin: 24 * 60,
  limit: 50,
  message: 'Too many code requests today. Please try again tomorrow.',
})
export const otpSendLimiter = [otpSendBurstLimiter, otpSendDailyLimiter]

// Re-checking the password of a signed-in user (change password, delete account): keyed by
// account so a stolen session can't be used to brute-force the current password.
export const passwordCheckLimiter = make({
  windowMin: 15,
  limit: 10,
  message: 'Too many attempts. Please wait a few minutes and try again.',
  keyGenerator: (req) => `pw:${req.user?._id ?? ipKeyGenerator(req.ip)}`,
  skipSuccessfulRequests: true,
})

export const otpVerifyLimiter = make({
  windowMin: 15,
  limit: 20,
  message: 'Too many attempts. Please wait a few minutes and try again.',
})
