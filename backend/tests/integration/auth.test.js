/**
 * End-to-end auth flows against a real MongoDB (mongodb-memory-server by default).
 * Covers STS Module 2 automated checks + SEC-04, SEC-05, SEC-06, SEC-09, SEC-11.
 */
import cookieParser from 'cookie-parser'
import express from 'express'
import mongoose from 'mongoose'
import request from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import app from '../../src/app.js'
import { authenticate, authorize } from '../../src/middleware/auth.js'
import { errorHandler } from '../../src/middleware/errorHandler.js'
import Session from '../../src/models/Session.js'
import User from '../../src/models/User.js'
import { sentEmails } from '../../src/services/email.service.js'
import { otpStore } from '../../src/services/otpStore.js'
import { startDb } from '../helpers/db.js'

const db = await startDb()

const UA = {
  laptop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36',
  phone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
  tablet: 'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 Chrome/130.0 Safari/537.36',
}
const PASSWORD = 'Handcrafted123'
const lastCodeFor = (email) => [...sentEmails].reverse().find((m) => m.to === email).text.match(/\b\d{6}\b/)[0]
const cookieValue = (res, name) =>
  (res.headers['set-cookie'] || []).map((c) => c.split(';')[0]).find((c) => c.startsWith(`${name}=`))?.slice(name.length + 1)

function device(ua = UA.laptop) {
  const agent = request.agent(app)
  const wrap = (method) => (path) => agent[method](path).set('User-Agent', ua)
  return { get: wrap('get'), post: wrap('post'), patch: wrap('patch'), put: wrap('put'), delete: wrap('delete') }
}

async function registerAndVerify(dev, { email = 'asha@example.com', name = 'Asha', password = PASSWORD } = {}) {
  const reg = await dev.post('/api/v1/auth/register').send({ name, email, phone: '+91 98765 43210', password })
  expect(reg.status).toBe(201)
  const verify = await dev
    .post('/api/v1/auth/verify-email')
    .send({ email, code: lastCodeFor(email), registrationToken: reg.body.data.registrationToken })
  expect(verify.status).toBe(200)
  return verify.body.data.user
}

const login = (dev, body) => dev.post('/api/v1/auth/login').send({ email: 'asha@example.com', password: PASSWORD, ...body })

describe.skipIf(!db)('auth (integration)', () => {
  beforeEach(async () => {
    await db.reset()
    await otpStore.clear()
    sentEmails.length = 0
  })
  afterAll(async () => db?.stop())

  describe('registration', () => {
    it('registers, verifies by email OTP and signs in (STS #1–4)', async () => {
      const dev = device()
      const user = await registerAndVerify(dev)
      expect(user).toMatchObject({ email: 'asha@example.com', status: 'active', role: 'customer', phone: '+919876543210' })
      expect(user.passwordHash).toBeUndefined()

      const me = await dev.get('/api/v1/auth/me')
      expect(me.status).toBe(200)
      expect(me.body.data.session.deviceLabel).toBe('Chrome on Windows')
    })

    it('stores only a bcrypt hash of the password (NFR-S2)', async () => {
      await registerAndVerify(device())
      const doc = await User.findOne({ email: 'asha@example.com' }).select('+passwordHash').lean()
      expect(doc.passwordHash).toMatch(/^\$2[aby]\$12\$/)
      expect(doc.passwordHash).not.toContain(PASSWORD)
    })

    it('refuses login until the email is verified', async () => {
      const dev = device()
      await dev.post('/api/v1/auth/register').send({ name: 'Asha', email: 'asha@example.com', phone: '+919876543210', password: PASSWORD })
      const res = await login(dev)
      expect(res.status).toBe(403)
      expect(res.body.error.code).toBe('ACCOUNT_NOT_VERIFIED')
    })

    it('rejects registering an already-active email', async () => {
      await registerAndVerify(device())
      const res = await device().post('/api/v1/auth/register').send({ name: 'Xavier', email: 'ASHA@example.com', phone: '+919876543210', password: PASSWORD })
      expect(res.status).toBe(409)
      expect(res.body.error.code).toBe('EMAIL_TAKEN')
    })

    it("blocks the pending-account hijack: a code only verifies the registrant's own attempt", async () => {
      const victim = device()
      const attacker = device(UA.phone)
      const v = await victim.post('/api/v1/auth/register').send({ name: 'Asha', email: 'asha@example.com', phone: '+919876543210', password: PASSWORD })
      await otpStore.del('otp-cd:registration:asha@example.com') // skip the 60s cooldown for the test
      await attacker.post('/api/v1/auth/register').send({ name: 'Evil', email: 'asha@example.com', phone: '+15550000000', password: 'Attacker123' })

      // Victim receives the latest code but holds the old registration token → refused
      const res = await victim
        .post('/api/v1/auth/verify-email')
        .send({ email: 'asha@example.com', code: lastCodeFor('asha@example.com'), registrationToken: v.body.data.registrationToken })
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('REGISTRATION_EXPIRED')
      expect((await User.findOne({ email: 'asha@example.com' })).status).toBe('pending_verification')
    })

    it('locks the code after 5 wrong attempts (STS #5)', async () => {
      const dev = device()
      const reg = await dev.post('/api/v1/auth/register').send({ name: 'Asha', email: 'asha@example.com', phone: '+919876543210', password: PASSWORD })
      const code = lastCodeFor('asha@example.com')
      const wrong = code === '000000' ? '111111' : '000000'
      const body = { email: 'asha@example.com', registrationToken: reg.body.data.registrationToken }
      for (let i = 0; i < 4; i++) {
        expect((await dev.post('/api/v1/auth/verify-email').send({ ...body, code: wrong })).body.error.code).toBe('OTP_INVALID')
      }
      expect((await dev.post('/api/v1/auth/verify-email').send({ ...body, code: wrong })).body.error.code).toBe('OTP_LOCKED')
      expect((await dev.post('/api/v1/auth/verify-email').send({ ...body, code })).body.error.code).toBe('OTP_EXPIRED')
    })
  })

  describe('login & 2-device cap (FR2.3, SEC-04)', () => {
    it('uses one generic error for unknown email and wrong password', async () => {
      await registerAndVerify(device())
      const a = await login(device(), { password: 'WrongPass123' })
      const b = await login(device(), { email: 'nobody@example.com' })
      expect(a.status).toBe(401)
      expect(b.status).toBe(401)
      expect(a.body.error).toEqual(b.body.error)
    })

    it('allows 2 devices, then lists sessions on the 3rd and lets the user revoke one (STS #6–8)', async () => {
      const laptop = device(UA.laptop)
      await registerAndVerify(laptop) // device 1
      const phone = device(UA.phone)
      expect((await login(phone)).status).toBe(200) // device 2

      const tablet = device(UA.tablet)
      const blocked = await login(tablet)
      expect(blocked.status).toBe(409)
      expect(blocked.body.error.code).toBe('SESSION_LIMIT')
      const sessions = blocked.body.error.details.sessions
      expect(sessions.map((s) => s.deviceLabel).sort()).toEqual(['Chrome on Windows', 'Safari on iOS'])
      expect(cookieValue(blocked, 'rg_access')).toBeUndefined()

      const phoneSession = sessions.find((s) => s.deviceLabel === 'Safari on iOS')
      const retry = await login(tablet, { revokeSessionId: phoneSession.id })
      expect(retry.status).toBe(200)
      expect((await phone.get('/api/v1/auth/me')).status).toBe(401) // revoked immediately
      expect((await laptop.get('/api/v1/auth/me')).status).toBe(200)
    })

    it('a wrong password with revokeSessionId revokes nothing', async () => {
      const laptop = device()
      await registerAndVerify(laptop)
      const me = await laptop.get('/api/v1/auth/me')
      await login(device(UA.tablet), { password: 'WrongPass123', revokeSessionId: me.body.data.session.id })
      expect((await laptop.get('/api/v1/auth/me')).status).toBe(200)
    })

    it('enforces the cap at the database level under concurrent logins', async () => {
      await registerAndVerify(device())
      await Session.updateMany({}, { isActive: false })
      const results = await Promise.all([UA.laptop, UA.phone, UA.tablet, UA.laptop, UA.phone].map((ua) => login(device(ua))))
      const ok = results.filter((r) => r.status === 200).length
      expect(ok).toBeLessThanOrEqual(2)
      expect(await Session.countDocuments({ isActive: true })).toBeLessThanOrEqual(2)
    })

    it("can't revoke another customer's session (SEC-11)", async () => {
      const asha = device()
      await registerAndVerify(asha)
      const ravi = device(UA.phone)
      await registerAndVerify(ravi, { email: 'ravi@example.com', name: 'Ravi' })
      const raviSession = (await ravi.get('/api/v1/auth/me')).body.data.session.id

      const res = await asha.delete(`/api/v1/auth/sessions/${raviSession}`)
      expect(res.status).toBe(404)
      expect((await ravi.get('/api/v1/auth/me')).status).toBe(200)
    })
  })

  describe('refresh rotation (SEC-05)', () => {
    it('rotates the refresh token and revokes every session when an old one is replayed', async () => {
      const laptop = device()
      await registerAndVerify(laptop)
      const phone = device(UA.phone)
      const phoneLogin = await login(phone)
      const original = cookieValue(phoneLogin, 'rg_refresh')

      const rotated = await phone.post('/api/v1/auth/refresh')
      expect(rotated.status).toBe(200)
      expect(cookieValue(rotated, 'rg_refresh')).not.toBe(original)

      const replay = await request(app).post('/api/v1/auth/refresh').set('Cookie', `rg_refresh=${original}`)
      expect(replay.status).toBe(401)
      expect(replay.body.error.code).toBe('REFRESH_REUSED')

      expect((await phone.get('/api/v1/auth/me')).status).toBe(401)
      expect((await laptop.get('/api/v1/auth/me')).status).toBe(401)
      expect(await Session.countDocuments({ isActive: true })).toBe(0)
    })
  })

  describe('logout (FR2.4)', () => {
    it('logout ends only this device; logout-all ends every device', async () => {
      const laptop = device()
      await registerAndVerify(laptop)
      const phone = device(UA.phone)
      await login(phone)

      expect((await phone.post('/api/v1/auth/logout')).status).toBe(200)
      expect((await phone.get('/api/v1/auth/me')).status).toBe(401)
      expect((await laptop.get('/api/v1/auth/me')).status).toBe(200)

      await login(phone)
      expect((await laptop.post('/api/v1/auth/logout-all')).status).toBe(200)
      expect((await laptop.get('/api/v1/auth/me')).status).toBe(401)
      expect((await phone.get('/api/v1/auth/me')).status).toBe(401)
    })

    it('a logged-out refresh token cannot mint new access', async () => {
      const laptop = device()
      await registerAndVerify(laptop)
      await laptop.post('/api/v1/auth/logout')
      expect((await laptop.post('/api/v1/auth/refresh')).status).toBe(401)
    })
  })

  describe('password reset (FR2.5, STS #9)', () => {
    it('resets via OTP, signs out every device and rejects the old password', async () => {
      const laptop = device()
      await registerAndVerify(laptop)

      const anon = device(UA.phone)
      expect((await anon.post('/api/v1/auth/forgot-password').send({ email: 'asha@example.com' })).status).toBe(200)
      const reset = await anon
        .post('/api/v1/auth/reset-password')
        .send({ email: 'asha@example.com', code: lastCodeFor('asha@example.com'), newPassword: 'NewSilver456' })
      expect(reset.status).toBe(200)

      expect((await laptop.get('/api/v1/auth/me')).status).toBe(401)
      expect((await login(device())).status).toBe(401)
      expect((await login(device(), { password: 'NewSilver456' })).status).toBe(200)
    })

    it("answers identically for unknown emails and doesn't send anything", async () => {
      const res = await device().post('/api/v1/auth/forgot-password').send({ email: 'ghost@example.com' })
      expect(res.status).toBe(200)
      expect(sentEmails).toHaveLength(0)
    })
  })

  describe('RBAC (SEC-09)', () => {
    it('rejects a valid non-admin session with 403 and lets an admin through', async () => {
      const probe = express()
      probe.use(cookieParser())
      probe.get('/admin-only', authenticate, authorize('admin'), (req, res) => res.json({ ok: true }))
      probe.use(errorHandler)

      await registerAndVerify(device())
      const res = await login(device(UA.phone))
      const cookie = `rg_access=${cookieValue(res, 'rg_access')}`

      expect((await request(probe).get('/admin-only').set('Cookie', cookie)).status).toBe(403)

      // Role is read from the DB per request: promoting takes effect without re-login
      await User.updateOne({ email: 'asha@example.com' }, { role: 'admin' })
      expect((await request(probe).get('/admin-only').set('Cookie', cookie)).status).toBe(200)
    })
  })

  describe('profile & addresses (FR2.7)', () => {
    const address = {
      label: 'Home',
      fullName: 'Asha Rao',
      phone: '+91 98765 43210',
      line1: '12 Lake View Road',
      city: 'Udaipur',
      state: 'Rajasthan',
      postalCode: '313001',
      country: 'in',
    }

    it('updates whitelisted profile fields only', async () => {
      const dev = device()
      await registerAndVerify(dev)
      const res = await dev.patch('/api/v1/users/me').send({ name: 'Asha R', preferredCurrency: 'USD', role: 'admin', email: 'x@y.com' })
      expect(res.status).toBe(200)
      expect(res.body.data.user).toMatchObject({ name: 'Asha R', preferredCurrency: 'USD', role: 'customer', email: 'asha@example.com' })
    })

    it('adds, edits, defaults and deletes addresses', async () => {
      const dev = device()
      await registerAndVerify(dev)
      let res = await dev.post('/api/v1/users/me/addresses').send(address)
      expect(res.status).toBe(201)
      expect(res.body.data.addresses[0]).toMatchObject({ country: 'IN', isDefault: true, phone: '+919876543210' })

      res = await dev.post('/api/v1/users/me/addresses').send({ ...address, label: 'Studio', isDefault: true })
      const [home, studio] = res.body.data.addresses
      expect(home.isDefault).toBe(false)
      expect(studio.isDefault).toBe(true)

      res = await dev.put(`/api/v1/users/me/addresses/${home._id}`).send({ ...address, city: 'Jaipur' })
      expect(res.body.data.addresses[0].city).toBe('Jaipur')

      res = await dev.delete(`/api/v1/users/me/addresses/${studio._id}`)
      expect(res.body.data.addresses).toHaveLength(1)
      expect(res.body.data.addresses[0].isDefault).toBe(true)
    })

    it("can't touch an address id that isn't yours", async () => {
      const dev = device()
      await registerAndVerify(dev)
      const res = await dev.delete(`/api/v1/users/me/addresses/${new mongoose.Types.ObjectId()}`)
      expect(res.status).toBe(404)
    })
  })
  describe('change password & delete account', () => {
    it('changes the password with the current one and signs out other devices only', async () => {
      const laptop = device()
      await registerAndVerify(laptop)
      const phone = device(UA.phone)
      await phone.post('/api/v1/auth/login').send({ email: 'asha@example.com', password: PASSWORD })

      let res = await laptop.post('/api/v1/auth/change-password').send({ currentPassword: 'Wrong1234', newPassword: 'NewPass123' })
      expect(res.status).toBe(400)
      res = await laptop.post('/api/v1/auth/change-password').send({ currentPassword: PASSWORD, newPassword: PASSWORD })
      expect(res.status).toBe(422)
      res = await laptop.post('/api/v1/auth/change-password').send({ currentPassword: PASSWORD, newPassword: 'NewPass123' })
      expect(res.status).toBe(200)

      expect((await laptop.get('/api/v1/auth/me')).status).toBe(200)
      expect((await phone.get('/api/v1/auth/me')).status).toBe(401)
      expect((await device().post('/api/v1/auth/login').send({ email: 'asha@example.com', password: PASSWORD })).status).toBe(401)
    })

    it('deletes the account only with the right password, and the email can register again', async () => {
      const dev = device()
      await registerAndVerify(dev)
      expect((await dev.delete('/api/v1/users/me').send({ password: 'Wrong1234' })).status).toBe(400)
      expect((await dev.delete('/api/v1/users/me').send({ password: PASSWORD })).status).toBe(200)
      expect((await dev.get('/api/v1/auth/me')).status).toBe(401)
      expect((await device().post('/api/v1/auth/login').send({ email: 'asha@example.com', password: PASSWORD })).status).toBe(401)
      const again = await device().post('/api/v1/auth/register').send({ name: 'Asha', email: 'asha@example.com', phone: '+919876543210', password: PASSWORD })
      expect(again.body.error?.code).not.toBe('EMAIL_TAKEN') // 201, or 429 if still inside the 60s resend cooldown
    })
  })
})
