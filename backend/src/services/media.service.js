import crypto from 'node:crypto'
import { env } from '../config/env.js'
import AppError from '../utils/AppError.js'

/**
 * Cloudinary direct uploads: the browser uploads the file straight to Cloudinary (big
 * videos never pass through our server); we only sign the request so nobody else can
 * upload into our account. CLOUDINARY_URL = cloudinary://<api_key>:<api_secret>@<cloud_name>
 */
export function cloudinaryConfig() {
  if (!env.cloudinaryUrl) return null
  try {
    const u = new URL(env.cloudinaryUrl)
    if (u.protocol !== 'cloudinary:') return null
    return { cloudName: u.hostname, apiKey: decodeURIComponent(u.username), apiSecret: decodeURIComponent(u.password) }
  } catch {
    return null
  }
}

const FOLDER = `ratnagiri/${env.isProd ? 'products' : 'dev-products'}`

/** Cloudinary signature: sha1 of the sorted params + api secret. */
export function signParams(params, apiSecret) {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&')
  return crypto.createHash('sha1').update(toSign + apiSecret).digest('hex')
}

export function createUploadSignature() {
  const cfg = cloudinaryConfig()
  if (!cfg) throw new AppError(503, 'Photo uploads are not set up yet (CLOUDINARY_URL is missing).', 'MEDIA_NOT_CONFIGURED')
  const timestamp = Math.floor(Date.now() / 1000)
  const params = { folder: FOLDER, timestamp }
  return {
    cloudName: cfg.cloudName,
    apiKey: cfg.apiKey,
    folder: FOLDER,
    timestamp,
    signature: signParams(params, cfg.apiSecret),
    uploadUrl: `https://api.cloudinary.com/v1_1/${cfg.cloudName}/auto/upload`,
  }
}

/**
 * Media URLs must be ours: Cloudinary in our cloud. Without Cloudinary configured (local
 * dev) any https URL or a site-relative path is allowed so the catalog can be tried out.
 */
export function isAllowedMediaUrl(url) {
  if (typeof url !== 'string' || url.length > 500) return false
  const cfg = cloudinaryConfig()
  if (cfg) return url.startsWith(`https://res.cloudinary.com/${cfg.cloudName}/`)
  if (env.isProd) return false
  return /^https:\/\/[^\s]+$/.test(url) || /^\/[^\s/][^\s]*$/.test(url)
}

/** Best-effort delete when an image/video is removed from a product. */
export async function destroyMedia({ publicId, type }) {
  const cfg = cloudinaryConfig()
  if (!cfg || !publicId) return
  const timestamp = Math.floor(Date.now() / 1000)
  const signature = signParams({ public_id: publicId, timestamp }, cfg.apiSecret)
  const body = new URLSearchParams({ public_id: publicId, timestamp: String(timestamp), api_key: cfg.apiKey, signature })
  const resource = type === 'video' ? 'video' : 'image'
  try {
    await fetch(`https://api.cloudinary.com/v1_1/${cfg.cloudName}/${resource}/destroy`, { method: 'POST', body })
  } catch (err) {
    console.warn('[media] could not delete', publicId, err.message)
  }
}
