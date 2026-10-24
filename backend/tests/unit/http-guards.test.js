/**
 * Request-level guards that reject bad input *before* any database access,
 * so these run without MongoDB.
 */
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import app from '../../src/app.js'
import deviceLabel from '../../src/utils/deviceLabel.js'
import { parseRefreshToken, signAccessToken, verifyAccessToken } from '../../src/services/token.service.js'

describe('input guards', () => {
  it('SEC-06: rejects NoSQL operator payloads on login', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: { $ne: null }, password: { $ne: null } })
    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({ success: false, error: { code: 'INVALID_INPUT' } })
  })

  it('rejects nested operator keys anywhere in the body', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ name: 'A', meta: { deep: { $gt: '' } } })
    expect(res.status).toBe(400)
  })

  it('returns 422 with per-field messages for invalid registration', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'A', email: 'not-an-email', phone: '12', password: 'short' })
    expect(res.status).toBe(422)
    expect(Object.keys(res.body.error.details.fields).sort()).toEqual(['email', 'name', 'password', 'phone'])
  })

  it('requires a letter and a number in passwords', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Asha', email: 'a@example.com', phone: '+919876543210', password: 'onlyletters' })
    expect(res.body.error.details.fields.password).toMatch(/number/)
  })

  it('returns 400 (not 500) for malformed JSON', async () => {
    const res = await request(app).post('/api/v1/auth/login').set('Content-Type', 'application/json').send('{"email":')
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('BAD_JSON')
  })

  it('401s protected routes without a session cookie', async () => {
    for (const path of ['/api/v1/auth/me', '/api/v1/auth/sessions', '/api/v1/users/me']) {
      const res = await request(app).get(path)
      expect(res.status).toBe(401)
    }
  })

  it('401s a forged access token', async () => {
    const res = await request(app).get('/api/v1/auth/me').set('Cookie', 'rg_access=eyJhbGciOiJub25lIn0.e30.')
    expect(res.status).toBe(401)
  })

  it('refresh without a cookie is a clean 401', async () => {
    const res = await request(app).post('/api/v1/auth/refresh')
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('REFRESH_INVALID')
  })

  it('sets security headers and hides the framework', async () => {
    const res = await request(app).get('/api/health')
    expect(res.headers['x-powered-by']).toBeUndefined()
    expect(res.headers['x-content-type-options']).toBe('nosniff')
  })
})

describe('token helpers', () => {
  it('round-trips an access token and rejects tampering', () => {
    const token = signAccessToken({ userId: '64b000000000000000000001', sessionId: '64b000000000000000000002' })
    expect(verifyAccessToken(token)).toMatchObject({ sub: '64b000000000000000000001', sid: '64b000000000000000000002' })
    expect(verifyAccessToken(token.slice(0, -2) + 'xx')).toBeNull()
  })

  it('only parses well-formed refresh tokens', () => {
    expect(parseRefreshToken('64b000000000000000000002.abc')).toEqual({ sessionId: '64b000000000000000000002' })
    expect(parseRefreshToken('nope')).toBeNull()
    expect(parseRefreshToken({ $ne: 1 })).toBeNull()
  })

  it('labels common devices', () => {
    expect(deviceLabel('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36')).toBe('Chrome on Windows')
    expect(deviceLabel('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1')).toBe('Safari on iOS')
  })
})
