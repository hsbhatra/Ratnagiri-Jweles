import Redis from 'ioredis'
import { env } from '../config/env.js'
import describeRedisUrl from '../utils/describeRedisUrl.js'

/**
 * Tiny key/value-with-TTL store for OTPs (Architecture §4.3: Redis, not Mongo).
 * Uses Upstash Redis when UPSTASH_REDIS_URL is set, otherwise an in-process Map
 * (fine for local dev/tests; refused in production so OTPs survive restarts/instances).
 */
class MemoryStore {
  constructor() {
    this.map = new Map()
  }
  _live(key) {
    const hit = this.map.get(key)
    if (!hit) return null
    if (hit.expiresAt <= Date.now()) {
      this.map.delete(key)
      return null
    }
    return hit
  }
  async get(key) {
    return this._live(key)?.value ?? null
  }
  async set(key, value, ttlSec) {
    this.map.set(key, { value, expiresAt: Date.now() + ttlSec * 1000 })
  }
  async ttl(key) {
    const hit = this._live(key)
    return hit ? Math.ceil((hit.expiresAt - Date.now()) / 1000) : -2
  }
  /** Atomic counter; the TTL starts with the first increment. */
  async incr(key, ttlSec) {
    const hit = this._live(key)
    if (hit) {
      hit.value = String(Number(hit.value) + 1)
      return Number(hit.value)
    }
    this.map.set(key, { value: '1', expiresAt: Date.now() + ttlSec * 1000 })
    return 1
  }
  /** Returns how many keys were removed (1 or 0), like Redis DEL. */
  async del(key) {
    return this._live(key) ? Number(this.map.delete(key)) : 0
  }
  async clear() {
    this.map.clear()
  }
}

class RedisStore {
  constructor(url) {
    const where = describeRedisUrl(url)
    if (url.startsWith('redis://') && /upstash\.io/.test(url)) {
      console.warn(`[redis] ${where} — Upstash needs TLS: the URL must start with rediss:// (two s)`)
    }
    this.client = new Redis(url, { maxRetriesPerRequest: 2, connectTimeout: 10_000 })
    this.client.on('ready', () => console.log(`[redis] connected to ${where}`))
    let lastError = ''
    this.client.on('error', (err) => {
      // ioredis retries forever; log each distinct problem once instead of every retry
      if (err.message === lastError) return
      lastError = err.message
      console.error(`[redis] ${where}: ${err.message}`)
    })
  }
  get(key) {
    return this.client.get(key)
  }
  set(key, value, ttlSec) {
    return this.client.set(key, value, 'EX', ttlSec)
  }
  ttl(key) {
    return this.client.ttl(key)
  }
  async incr(key, ttlSec) {
    const n = await this.client.incr(key)
    if (n === 1) await this.client.expire(key, ttlSec)
    return n
  }
  del(key) {
    return this.client.del(key)
  }
}

function createStore() {
  if (env.redisUrl) return new RedisStore(env.redisUrl)
  if (env.isProd) throw new Error('[otp] UPSTASH_REDIS_URL is required in production')
  if (!env.isTest) console.warn('[otp] UPSTASH_REDIS_URL not set — using in-memory OTP store (dev only)')
  return new MemoryStore()
}

export const otpStore = createStore()
