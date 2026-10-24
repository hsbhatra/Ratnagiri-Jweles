import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { sendError } from './errorHandler.js'

/**
 * Deployed behind Netlify: the storefront calls `/api/*` on its own domain and Netlify
 * proxies those calls to Render, which keeps the session cookies first-party
 * (SameSite=strict). Netlify signs every proxied request (netlify.toml `signed = ...`)
 * with an HS256 JWS in `x-nf-sign`.
 *
 * When EDGE_PROXY_SECRET is set this middleware:
 *  1. refuses API calls that did not come through Netlify (someone hitting the
 *     onrender.com URL directly), so nobody can skip the storefront domain and
 *  2. takes the visitor's real IP from Netlify's `x-nf-client-connection-ip` — otherwise
 *     every visitor would look like the same few Netlify servers to the rate limiters.
 * The health check stays open so Render (and an uptime pinger) can reach it directly.
 * Without the secret (local dev, tests) it does nothing.
 */
export default function edgeProxy(req, res, next) {
  const secret = env.edgeProxySecret
  if (!secret || req.path === '/api/health') return next()

  try {
    jwt.verify(req.get('x-nf-sign') || '', secret, { algorithms: ['HS256'], issuer: 'netlify' })
  } catch {
    return sendError(res, 403, 'Requests must come through the storefront.', 'DIRECT_ACCESS')
  }

  const clientIp = req.get('x-nf-client-connection-ip')
  if (clientIp) Object.defineProperty(req, 'ip', { value: clientIp, configurable: true })
  next()
}
