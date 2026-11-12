import mongoose from 'mongoose'

/** NFR-S12: who changed what in the admin (products, prices, stock, categories, later orders). */
const auditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  actorEmail: String,
  action: { type: String, required: true }, // e.g. product.create, product.update, product.archive
  entity: { type: String, required: true }, // 'product' | 'category'
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
  summary: String, // human-readable, e.g. "Citrine Halo Ring"
  changes: { type: mongoose.Schema.Types.Mixed }, // { field: { from, to } }
  at: { type: Date, default: Date.now },
})

auditLogSchema.index({ entity: 1, entityId: 1, at: -1 })
auditLogSchema.index({ at: -1 })

export default mongoose.model('AuditLog', auditLogSchema)
