import mongoose from 'mongoose'

/**
 * FR3.4: collections with one level of sub-collections ("Rings" → "Stackable Rings").
 * Deleting is refused while products or sub-collections use it; deactivate instead.
 */
const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 80 },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    description: { type: String, trim: true, maxlength: 500 },
    image: { url: String, publicId: String, alt: String },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

categorySchema.index({ parent: 1, sortOrder: 1 })

categorySchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    return ret
  },
})

export default mongoose.model('Category', categorySchema)
