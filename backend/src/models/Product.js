import mongoose from 'mongoose'
import { GEM_SLUGS } from '../constants/gems.js'
import { METAL_SLUGS } from '../constants/metals.js'

/**
 * FR3.1–FR3.6. All money is stored as whole paise (integers) in INR, the base currency —
 * never floats — and converted for display only (Module 5).
 *
 * Sizes vs variants (owner still to decide, see OWNER_QUESTIONS.md) — both are supported:
 *  - `sizes`: one product, a list of sizes each with its own stock, same price for all.
 *    When sizes exist, `stock` is their total (kept in sync on save).
 *  - `variantGroupId`: separate products (own SKU/price/stock/photos) shown together on
 *    one product page with a selector, e.g. the same ring in Citrine and in Amethyst.
 */
const mediaSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['image', 'video'], required: true },
    url: { type: String, required: true, maxlength: 500 },
    publicId: { type: String, maxlength: 300 }, // Cloudinary id, for deleting/transforming
    alt: { type: String, trim: true, maxlength: 200 },
    width: Number,
    height: Number,
  },
  { _id: true }
)

const stoneSchema = new mongoose.Schema(
  {
    gem: { type: String, enum: GEM_SLUGS, required: true },
    shape: { type: String, trim: true, maxlength: 40 }, // round, oval, pear…
    sizeMm: { type: String, trim: true, maxlength: 20 }, // "6", "8x6"
    carat: { type: Number, min: 0, max: 1000 },
    count: { type: Number, min: 1, max: 500, default: 1 },
  },
  { _id: false }
)

const sizeSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 20 }, // "US 7", "18 in"
    stock: { type: Number, required: true, min: 0, max: 100000, default: 0 },
  },
  { _id: true }
)

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 90 },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 40 },
    description: { type: String, trim: true, maxlength: 5000 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    status: { type: String, enum: ['draft', 'active', 'archived'], default: 'draft' },
    archivedAt: { type: Date, default: null },

    // Pricing (paise). sellingPrice is derived from mrp + discount on every save.
    costPrice: { type: Number, min: 0, default: null }, // internal only, never sent to shoppers
    mrp: { type: Number, required: true, min: 100 },
    discount: {
      type: { type: String, enum: ['none', 'percent', 'flat'], default: 'none' },
      value: { type: Number, min: 0, default: 0 }, // percent 0–90, or flat paise
    },
    sellingPrice: { type: Number, required: true, min: 100 },

    // Inventory
    stock: { type: Number, required: true, min: 0, max: 100000, default: 0 },
    sizes: { type: [sizeSchema], default: [] },
    lowStockThreshold: { type: Number, min: 0, max: 1000, default: 3 },

    // Variants (FR3.3)
    variantGroupId: { type: mongoose.Schema.Types.ObjectId, default: null },
    variantLabel: { type: String, trim: true, maxlength: 40 }, // shown in the selector, e.g. "Amethyst"

    media: { type: [mediaSchema], default: [] },

    // Details
    metal: { type: String, enum: [...METAL_SLUGS, null], default: null },
    purity: { type: String, trim: true, maxlength: 40 }, // e.g. "925"
    stones: { type: [stoneSchema], default: [] },
    weightGrams: { type: Number, min: 0, max: 5000, default: null },
    dimensions: {
      lengthMm: { type: Number, min: 0, max: 2000 },
      widthMm: { type: Number, min: 0, max: 2000 },
      heightMm: { type: Number, min: 0, max: 2000 },
    },
    handmade: { type: Boolean, default: true },
    madeToOrder: { type: Boolean, default: false },
    makingDays: { type: Number, min: 0, max: 120, default: null },
    careNotes: { type: String, trim: true, maxlength: 1000 },
    tags: { type: [String], default: [] },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true }
)

productSchema.index({ status: 1, category: 1, sellingPrice: 1 })
productSchema.index({ status: 1, createdAt: -1 })
productSchema.index({ variantGroupId: 1 })
productSchema.index({ 'stones.gem': 1 })

/** Selling price from MRP + discount, rounded to whole rupees. */
export function computeSellingPrice(mrp, discount = {}) {
  let price = mrp
  if (discount.type === 'percent') price = mrp * (1 - discount.value / 100)
  if (discount.type === 'flat') price = mrp - discount.value
  return Math.max(100, Math.round(price / 100) * 100)
}

productSchema.pre('validate', function syncDerived() {
  this.sellingPrice = computeSellingPrice(this.mrp, this.discount)
  if (this.sizes?.length) this.stock = this.sizes.reduce((sum, s) => sum + (s.stock || 0), 0)
  if (this.status === 'archived' && !this.archivedAt) this.archivedAt = new Date()
  if (this.status !== 'archived') this.archivedAt = null
})

productSchema.virtual('inStock').get(function inStock() {
  return this.madeToOrder || this.stock > 0
})
productSchema.virtual('lowStock').get(function lowStock() {
  return !this.madeToOrder && this.stock <= this.lowStockThreshold
})

const clean = (doc, ret) => {
  ret.id = ret._id.toString()
  delete ret._id
  delete ret.__v
  return ret
}
productSchema.set('toJSON', { virtuals: true, transform: clean })

/** What shoppers see: no cost price, no stock numbers beyond what's needed. */
productSchema.methods.toPublic = function toPublic() {
  const p = this.toJSON()
  delete p.costPrice
  delete p.lowStockThreshold
  delete p.lowStock
  delete p.archivedAt
  return p
}

export default mongoose.model('Product', productSchema)
