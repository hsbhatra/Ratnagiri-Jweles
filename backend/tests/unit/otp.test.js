import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sentEmails } from '../../src/services/email.service.js'
import { OTP_DAILY_MAX, issueOtp, verifyOtp } from '../../src/services/otp.service.js'
import { otpStore } from '../../src/services/otpStore.js'

const target = 'asha@example.com'
const lastCode = () => sentEmails.at(-1).text.match(/\b\d{6}\b/)[0]
const wrongCode = (code) => String((Number(code) + 1) % 1_000_000).padStart(6, '0')

describe('OTP service (NFR-S6)', () => {
  beforeEach(async () => {
    vi.useFakeTimers()
    sentEmails.length = 0
    await otpStore.clear()
  })
  afterEach(() => vi.useRealTimers())

  it('emails a 6-digit code and accepts it exactly once', async () => {
    await issueOtp({ target, purpose: 'registration', name: 'Asha' })
    const code = lastCode()
    expect(sentEmails.at(-1).to).toBe(target)
    await expect(verifyOtp({ target, purpose: 'registration', code })).resolves.toBe(true)
    await expect(verifyOtp({ target, purpose: 'registration', code })).rejects.toMatchObject({ code: 'OTP_EXPIRED' })
  })

  it('never stores the raw code', async () => {
    await issueOtp({ target, purpose: 'registration' })
    const raw = await otpStore.get(`otp:registration:${target}`)
    expect(raw).not.toContain(lastCode())
  })

  it('locks after 5 wrong attempts, even if the right code comes next (STS Module 2 #5)', async () => {
    await issueOtp({ target, purpose: 'registration' })
    const code = lastCode()
    for (let i = 1; i <= 4; i++) {
      await expect(verifyOtp({ target, purpose: 'registration', code: wrongCode(code) })).rejects.toMatchObject({
        code: 'OTP_INVALID',
        details: { attemptsLeft: 5 - i },
      })
    }
    await expect(verifyOtp({ target, purpose: 'registration', code: wrongCode(code) })).rejects.toMatchObject({ code: 'OTP_LOCKED' })
    await expect(verifyOtp({ target, purpose: 'registration', code })).rejects.toMatchObject({ code: 'OTP_EXPIRED' })
  })

  it('expires after 10 minutes', async () => {
    await issueOtp({ target, purpose: 'registration' })
    const code = lastCode()
    vi.advanceTimersByTime(10 * 60 * 1000 + 1)
    await expect(verifyOtp({ target, purpose: 'registration', code })).rejects.toMatchObject({ code: 'OTP_EXPIRED' })
  })

  it('enforces a 60s resend cooldown, then the new code replaces the old one', async () => {
    await issueOtp({ target, purpose: 'registration' })
    const first = lastCode()
    await expect(issueOtp({ target, purpose: 'registration' })).rejects.toMatchObject({ code: 'OTP_COOLDOWN', status: 429 })
    vi.advanceTimersByTime(61 * 1000)
    await issueOtp({ target, purpose: 'registration' })
    const second = lastCode()
    if (first !== second) {
      await expect(verifyOtp({ target, purpose: 'registration', code: first })).rejects.toMatchObject({ code: 'OTP_INVALID' })
    }
    await expect(verifyOtp({ target, purpose: 'registration', code: second })).resolves.toBe(true)
  })

  it('keeps registration and password-reset codes separate', async () => {
    await issueOtp({ target, purpose: 'registration' })
    const code = lastCode()
    await expect(verifyOtp({ target, purpose: 'password_reset', code })).rejects.toMatchObject({ code: 'OTP_EXPIRED' })
  })
})

describe('OTP abuse resistance', () => {
  beforeEach(async () => {
    vi.useFakeTimers()
    sentEmails.length = 0
    await otpStore.clear()
  })
  afterEach(() => vi.useRealTimers())

  it('counts parallel wrong guesses individually (no race past the 5-attempt cap)', async () => {
    await issueOtp({ target, purpose: 'registration' })
    const code = lastCode()
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () => verifyOtp({ target, purpose: 'registration', code: wrongCode(code) }))
    )
    expect(results.filter((r) => r.reason?.code === 'OTP_LOCKED').length).toBeGreaterThanOrEqual(4)
    await expect(verifyOtp({ target, purpose: 'registration', code })).rejects.toMatchObject({ code: 'OTP_EXPIRED' })
  })

  it('lets a correct code through only once under parallel use', async () => {
    await issueOtp({ target, purpose: 'registration' })
    const code = lastCode()
    const results = await Promise.allSettled([1, 2, 3].map(() => verifyOtp({ target, purpose: 'registration', code })))
    expect(results.filter((r) => r.status === 'fulfilled').length).toBe(1)
  })

  it('caps codes per address per day', async () => {
    for (let i = 0; i < OTP_DAILY_MAX; i++) {
      await issueOtp({ target, purpose: 'registration' })
      vi.advanceTimersByTime(61 * 1000)
    }
    await expect(issueOtp({ target, purpose: 'registration' })).rejects.toMatchObject({ code: 'OTP_DAILY_LIMIT', status: 429 })
    vi.advanceTimersByTime(24 * 60 * 60 * 1000)
    await expect(issueOtp({ target, purpose: 'registration' })).resolves.toBeTruthy()
  })
})
