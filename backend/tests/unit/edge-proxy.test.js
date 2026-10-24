/** Deployed servers only accept API calls signed by the Netlify proxy (middleware/edgeProxy.js). */
import express from 'express'
import jwt from 'jsonwebtoken'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { env } from '../../src/config/env.js'
import edgeProxy from '../../src/middleware/edgeProxy.js'

const SECRET = 'test-edge-secret'
const app = express()
app.use(edgeProxy)
app.get('/api/health', (req, res) => res.json({ ok: true }))
app.get('/api/v1/whoami', (req, res) => res.json({ ip: req.ip }))

const sign = (claims = {}, secret = SECRET) =>
  jwt.sign({ iss: 'netlify', site_url: 'https://x.netlify.app', ...claims }, secret, { algorithm: 'HS256', expiresIn: 60 })

describe('edge proxy guard', () => {
  beforeAll(() => (env.edgeProxySecret = SECRET))
  afterAll(() => (env.edgeProxySecret = undefined))

  it('refuses direct calls without a signature', async () => {
    const res = await request(app).get('/api/v1/whoami')
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('DIRECT_ACCESS')
  })

  it('refuses a signature made with the wrong secret or issuer', async () => {
    expect((await request(app).get('/api/v1/whoami').set('x-nf-sign', sign({}, 'nope'))).status).toBe(403)
    expect((await request(app).get('/api/v1/whoami').set('x-nf-sign', sign({ iss: 'evil' }))).status).toBe(403)
  })

  it('accepts signed calls and uses the visitor IP Netlify reports', async () => {
    const res = await request(app).get('/api/v1/whoami').set('x-nf-sign', sign()).set('x-nf-client-connection-ip', '203.0.113.9')
    expect(res.status).toBe(200)
    expect(res.body.ip).toBe('203.0.113.9')
  })

  it('leaves the health check open for Render and uptime pings', async () => {
    expect((await request(app).get('/api/health')).status).toBe(200)
  })
})
