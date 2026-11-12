import { matchedData } from 'express-validator'
import { sendSuccess } from '../middleware/errorHandler.js'
import { listAudit } from '../services/audit.service.js'
import * as categories from '../services/category.service.js'
import { createUploadSignature } from '../services/media.service.js'
import * as products from '../services/product.service.js'

// Admin catalog (FR3.1–FR3.6, FR7.2). Every route sits behind authenticate + authorize('admin').
const body = (req) => matchedData(req, { locations: ['body'] })

export async function listCategories(req, res) {
  sendSuccess(res, { categories: await categories.categoryTree({ includeInactive: true }) })
}
export async function createCategory(req, res) {
  sendSuccess(res, { category: await categories.createCategory(req.user, body(req)) }, undefined, 201)
}
export async function updateCategory(req, res) {
  sendSuccess(res, { category: await categories.updateCategory(req.user, req.params.id, body(req)) })
}
export async function deleteCategory(req, res) {
  await categories.deleteCategory(req.user, req.params.id)
  sendSuccess(res, { deleted: true })
}

export async function listProducts(req, res) {
  const { items, ...meta } = await products.listAdminProducts(matchedData(req, { locations: ['query'] }))
  sendSuccess(res, { products: items }, meta)
}
export async function getProduct(req, res) {
  const product = await products.getAdminProduct(req.params.id)
  sendSuccess(res, { product, variants: await products.listVariants(product.variantGroupId, { admin: true }) })
}
export async function createProduct(req, res) {
  sendSuccess(res, { product: await products.createProduct(req.user, body(req)) }, undefined, 201)
}
export async function updateProduct(req, res) {
  sendSuccess(res, { product: await products.updateProduct(req.user, req.params.id, body(req)) })
}
export async function archiveProduct(req, res) {
  sendSuccess(res, { product: await products.setArchived(req.user, req.params.id, true) })
}
export async function restoreProduct(req, res) {
  sendSuccess(res, { product: await products.setArchived(req.user, req.params.id, false) })
}
export async function updateStock(req, res) {
  sendSuccess(res, { product: await products.updateStock(req.user, req.params.id, body(req)) })
}
export async function linkVariant(req, res) {
  const { productId, variantLabel, otherLabel } = body(req)
  sendSuccess(res, { variants: await products.linkVariant(req.user, req.params.id, productId, { variantLabel, otherLabel }) })
}
export async function unlinkVariant(req, res) {
  sendSuccess(res, { product: await products.unlinkVariant(req.user, req.params.id) })
}

export async function mediaSignature(req, res) {
  sendSuccess(res, createUploadSignature())
}

export async function auditLog(req, res) {
  const { entity, entityId } = req.query
  sendSuccess(res, { entries: await listAudit({ entity, entityId: /^[a-f0-9]{24}$/.test(entityId || '') ? entityId : undefined }) })
}
