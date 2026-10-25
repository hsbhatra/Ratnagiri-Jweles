import mongoose from 'mongoose'

export const SUPPORTED_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'AED', 'SGD']
export const MAX_ADDRESSES = 5

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, maxlength: 40 }, // "Home", "Office"
    fullName: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    line1: { type: String, required: true, trim: true, maxlength: 200 },
    line2: { type: String, trim: true, maxlength: 200 },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    state: { type: String, trim: true, maxlength: 100 },
    postalCode: { type: String, required: true, trim: true, maxlength: 20 },
    country: { type: String, required: true, trim: true, uppercase: true, minlength: 2, maxlength: 2 }, // ISO-3166 alpha-2
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
)

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    // Collected but NOT verified in v1 (SMS OTP dropped). Not unique and not a login
    // identifier, so an unverified number can't be squatted to block its real owner.
    phone: { type: String, trim: true, maxlength: 20 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
    status: {
      type: String,
      enum: ['pending_verification', 'active', 'suspended'],
      default: 'pending_verification',
    },
    emailVerifiedAt: { type: Date, default: null },
    registrationTokenHash: { type: String, select: false }, // only while pending_verification
    passwordChangedAt: { type: Date, default: null },
    preferredCurrency: { type: String, enum: SUPPORTED_CURRENCIES, default: null }, // null = geo-detect
    addresses: {
      type: [addressSchema],
      validate: [(v) => v.length <= MAX_ADDRESSES, `At most ${MAX_ADDRESSES} saved addresses`],
    },
  },
  { timestamps: true }
)

// Abandoned sign-ups (never verified) are removed by MongoDB after 7 days. Verified
// accounts no longer match the filter, so the index never touches them.
userSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 7 * 24 * 60 * 60, partialFilterExpression: { status: 'pending_verification' } }
)

userSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    delete ret.passwordHash
    delete ret.registrationTokenHash
    return ret
  },
})

export default mongoose.model('User', userSchema)
