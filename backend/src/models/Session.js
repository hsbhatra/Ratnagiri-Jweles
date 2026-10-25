import mongoose from 'mongoose'

/**
 * One row per logged-in device (NFR-S3). Kept separate from User so login churn
 * doesn't rewrite the user document, and the TTL index cleans up expired rows.
 */
const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  refreshTokenHash: { type: String, required: true },
  userAgent: { type: String, maxlength: 500 },
  deviceLabel: { type: String, maxlength: 100 }, // e.g. "Chrome on Windows"
  ip: { type: String, maxlength: 64 },
  isActive: { type: Boolean, default: true },
  revokedAt: { type: Date, default: null },
  revokedReason: {
    type: String,
    enum: [null, 'logout', 'logout_all', 'user_revoked', 'password_reset', 'token_reuse', 'session_limit_race', 'password_change', 'account_deleted'],
    default: null,
  },
  createdAt: { type: Date, default: Date.now },
  lastUsedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
})

sessionSchema.index({ userId: 1, isActive: 1 })
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

sessionSchema.methods.toPublic = function toPublic(currentSessionId) {
  return {
    id: this._id.toString(),
    deviceLabel: this.deviceLabel || 'Unknown device',
    ip: this.ip,
    createdAt: this.createdAt,
    lastUsedAt: this.lastUsedAt,
    isCurrent: currentSessionId ? this._id.equals(currentSessionId) : false,
  }
}

export default mongoose.model('Session', sessionSchema)
