import 'dotenv/config'

const required = ['MONGODB_URI', 'JWT_ACCESS_SECRET', 'OTP_HASH_SECRET']

const nodeEnv = process.env.NODE_ENV || 'development'

export const env = {
  nodeEnv,
  isProd: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  port: process.env.PORT || 5000,
  mongodbUri: process.env.MONGODB_URI,
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',

  // Auth
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || (nodeEnv === 'production' ? undefined : 'dev-access-secret-change-me'),
  otpHashSecret: process.env.OTP_HASH_SECRET || (nodeEnv === 'production' ? undefined : 'dev-otp-secret-change-me'),
  accessTokenTtlSec: 15 * 60, // 15 min (Architecture §5.2)
  refreshTokenTtlSec: 30 * 24 * 60 * 60, // 30 days
  maxActiveSessions: 2, // NFR-S3 hard cap
  bcryptCost: 12, // NFR-S2 (min 10)
  otpTtlSec: 10 * 60, // NFR-S6: 5–10 min
  otpMaxAttempts: 5,
  otpResendCooldownSec: 60,
  // 'strict' works because the frontend calls the API same-origin (Vite proxy in dev,
  // host rewrite in prod). Only set to 'none' if the API is ever served cross-site.
  cookieSameSite: process.env.COOKIE_SAMESITE || 'strict',
  // Same value as API_SIGNATURE_TOKEN on Netlify; see middleware/edgeProxy.js
  edgeProxySecret: process.env.EDGE_PROXY_SECRET,

  // Providers
  resendApiKey: process.env.RESEND_API_KEY,
  emailFrom: process.env.EMAIL_FROM || 'RatnaGiri Jewels <onboarding@resend.dev>',
  razorpayKeyId: process.env.RAZORPAY_KEY_ID,
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
  cloudinaryUrl: process.env.CLOUDINARY_URL,
  redisUrl: process.env.UPSTASH_REDIS_URL,
}

export function assertEnv() {
  if (env.isTest) return
  const missing = required.filter((key) => !process.env[key])
  if (missing.length === 0) return
  // NFR-S11: never run production with missing/default secrets
  if (env.isProd) throw new Error(`[env] Missing required env vars: ${missing.join(', ')}`)
  console.warn(`[env] Missing env vars (using dev defaults): ${missing.join(', ')}`)
}
