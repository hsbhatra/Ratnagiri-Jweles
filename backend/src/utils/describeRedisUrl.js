/** "rediss://default:secret@host:6379" -> "rediss://host:6379" (safe to log) */
export default function describeRedisUrl(url) {
  try {
    const u = new URL(url)
    return `${u.protocol}//${u.hostname}:${u.port || 6379}`
  } catch {
    return '(not a valid URL)'
  }
}
