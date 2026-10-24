import mongoose from 'mongoose'
import app from './app.js'
import { env, assertEnv } from './config/env.js'
import { verifyEmailTransport } from './services/email.service.js'

assertEnv()

async function start() {
  try {
    if (env.mongodbUri) {
      await mongoose.connect(env.mongodbUri)
      console.log('[db] connected to MongoDB Atlas')
    } else {
      console.warn('[db] MONGODB_URI not set — starting without a DB connection')
    }

    // Surface a bad email login at boot instead of on a customer's first signup
    verifyEmailTransport()
      .then(({ provider, from }) =>
        console.log(`[email] provider: ${provider}${provider === 'console' ? ' (codes print here)' : ` — from ${from}`}`)
      )
      .catch((err) => console.error(`[email] ${err.message} — check SMTP_USER / SMTP_PASS`))

    app.listen(env.port, () => {
      console.log(`[server] RatnaGiri Jewels API listening on :${env.port} (${env.nodeEnv})`)
    })
  } catch (err) {
    console.error('[server] failed to start', err)
    process.exit(1)
  }
}

start()
