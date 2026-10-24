/**
 * Creates (or promotes) the single owner/admin account (FR2.8 — same auth system, role: admin).
 * Usage: ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='...' ADMIN_NAME='Owner' npm run seed:admin
 */
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { env } from '../src/config/env.js'
import User from '../src/models/User.js'

const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME = 'Store Owner' } = process.env

if (!env.mongodbUri) throw new Error('MONGODB_URI is not set')
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD')
if (ADMIN_PASSWORD.length < 12) throw new Error('Use an admin password of at least 12 characters')

await mongoose.connect(env.mongodbUri)
const email = ADMIN_EMAIL.trim().toLowerCase()
const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, env.bcryptCost)

const user = await User.findOneAndUpdate(
  { email },
  {
    $set: { role: 'admin', status: 'active', passwordHash, emailVerifiedAt: new Date() },
    $setOnInsert: { name: ADMIN_NAME },
  },
  { upsert: true, returnDocument: 'after' }
)
console.log(`Admin ready: ${user.email} (${user._id})`)
await mongoose.disconnect()
