/**
 * Checks UPSTASH_REDIS_URL from backend/.env: connects, writes, reads and deletes a key.
 * Usage: npm run redis:check
 */
import 'dotenv/config'
import Redis from 'ioredis'
import describeRedisUrl from '../src/utils/describeRedisUrl.js'

const url = (process.env.UPSTASH_REDIS_URL || '').trim()
if (!url) {
  console.error('UPSTASH_REDIS_URL is empty in backend/.env')
  process.exit(1)
}
console.log(`Checking ${describeRedisUrl(url)} ...`)
if (!url.startsWith('rediss://')) console.warn('Warning: Upstash URLs must start with rediss:// (TLS).')
if (/^["']|["']$|\s/.test(process.env.UPSTASH_REDIS_URL)) console.warn('Warning: the value has quotes or spaces around it — remove them.')

const client = new Redis(url, { maxRetriesPerRequest: 1, connectTimeout: 10_000, retryStrategy: () => null })
client.on('error', () => {}) // reported below
try {
  await client.set('rg:check', 'ok', 'EX', 30)
  const value = await client.get('rg:check')
  await client.del('rg:check')
  console.log(value === 'ok' ? 'OK — Redis works.' : `Unexpected reply: ${value}`)
} catch (err) {
  console.error(`Failed: ${err.message}`)
  if (/WRONGPASS|NOAUTH/i.test(err.message)) console.error('The password part of the URL is wrong — copy it again from Upstash.')
  if (/ENOTFOUND/i.test(err.message)) console.error('Host not found — check the part after @ in the URL.')
  if (/ECONNRESET|max retries|closed/i.test(err.message)) {
    console.error('The server dropped the connection: usually a redis:// URL (needs rediss://), the REST URL, or a wrong port.')
  }
  process.exitCode = 1
} finally {
  client.disconnect()
}
