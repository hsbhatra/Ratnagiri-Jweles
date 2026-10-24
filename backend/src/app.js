import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'

import { env } from './config/env.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import rejectMongoOperators from './middleware/sanitize.js'
import edgeProxy from './middleware/edgeProxy.js'
import authRoutes from './routes/auth.routes.js'
import healthRoutes from './routes/health.routes.js'
import userRoutes from './routes/user.routes.js'
// catalog/cart/checkout/order/admin routes mount here module-by-module

const app = express()

// Behind Render/Vercel proxies: needed for correct req.ip (rate limits, session IPs)
app.set('trust proxy', 1)
app.disable('x-powered-by')

// Only API calls proxied (and signed) by Netlify get through on the deployed servers
app.use(edgeProxy)

// NFR-S9: header hardening + CORS locked to known frontend origin
app.use(helmet())
app.use(cors({ origin: env.frontendOrigin, credentials: true }))

app.use(express.json({ limit: '100kb' }))
app.use(cookieParser())
if (!env.isTest) app.use(morgan(env.isProd ? 'combined' : 'dev'))
app.use(rejectMongoOperators)

// Health check sits before the rate limiter: Render probes it every few seconds
app.use('/api/health', healthRoutes)

// NFR-S8: baseline rate limiting; auth/OTP/payment endpoints get stricter
// per-route limits when those modules land.
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => env.isTest,
  })
)

app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/users', userRoutes)

app.use(notFoundHandler)
app.use(errorHandler)

export default app
