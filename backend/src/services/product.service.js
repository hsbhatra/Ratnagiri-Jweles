import mongoose from 'mongoose'
import { GEMS } from '../constants/gems.js'
import { METALS } from '../constants/metals.js'
import Category from '../models/Category.js'
import Product from '../models/Product.js'
import AppError from '../utils/AppError.js'
import slugify, { escapeRegex } from '../utils/slugify.js'
import { audit, diff } from './audit.service.js'
import { categoryIdsForSlug } from './category.service.js'
import { destroyMedia, isAllowedMediaUrl } from './media.service.js'

const AUDITED = [
  'name', 'slug', 'sku', 'description', 'category', 'status', 'costPrice', 'mrp', 'discount', 'sellingPrice',
  'stock', 'sizes', 'lowStockThreshold', 'variantGroupId', 'variantLabel', 'metal', 'purity', 'stones',
  'weightGrams', 'dimensions', 'handmade', 'madeToOrder', 'makingDays', 'careNotes', 'tags', 'featured', 'media',
]
const PAGE_MAX = 48

const fieldError = (field, message) => new AppError(422, message, 'VALIDATION_ERROR', { fields: { [field]: message } })

// ------------------------------------------------------------------ helpers

async function uniqueSlug(base, excludeId) {
  const root = slugify(base) || 'piece'
  for (let i = 1; i < 200; i++) {
    const slug = i === 1 ? root : `${root}-${i}`
    if (!(await Product.exists({ slug, ...(excludeId && { _id: { $ne: excludeId } }) }))) return slug
  }
  throw fieldError('slug', 'Could not create a unique link name.')
}

/** Owner hasn't settled an SKU format yet: generate RG-<COLLECTION>-<code> when left blank. */
async function generateSku(categoryId) {
  const cat = await Category.findById(categoryId).select('slug')
  const code = (cat?.slug || 'item').replace(/-/g, '').slice(0, 4).toUpperCase()
  for (let i = 0; i < 10; i++) {
    const sku = `RG-${code}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
    if (!(await Product.exists({ sku }))) return sku
  }
  throw fieldError('sku', 'Could not generate an SKU; please enter one.')
}

async function assertCategory(id) {
  if (!(await Category.exists({ _id: id }))) throw fieldError('category', 'Choose a collection')
}

function assertPricing({ mrp, discount, costPrice }) {
  if (discount?.type === 'percent' && (discount.value < 0 || discount.value > 90)) {
    throw fieldError('discount', 'A percentage discount must be between 0 and 90.')
  }
  if (discount?.type === 'flat' && discount.value >= mrp) throw fieldError('discount', 'A flat discount must be less than the MRP.')
  if (costPrice != null && costPrice > mrp) throw fieldError('costPrice', 'Cost price is higher than the MRP — check the numbers.')
}

function assertMedia(media = []) {
  if (media.length > 15) throw fieldError('media', 'Up to 15 photos/videos per product.')
  for (const m of media) {
    if (!isAllowedMediaUrl(m.url)) throw fieldError('media', 'Media must be uploaded through the admin panel.')
  }
}

function assertSizes(sizes = []) {
  const labels = sizes.map((s) => s.label.trim().toLowerCase())
  if (new Set(labels).size !== labels.length) throw fieldError('sizes', 'Each size can only be listed once.')
}

/** Before activating a product, make sure shoppers would see something sensible. */
function assertPublishable(product) {
  if (product.status !== 'active') return
  if (!product.media.some((m) => m.type === 'image')) throw fieldError('media', 'Add at least one photo before publishing.')
  if (!product.description) throw fieldError('description', 'Add a description before publishing.')
}

// ------------------------------------------------------------------ admin

export async function createProduct(actor, input) {
  await assertCategory(input.category)
  assertPricing(input)
  assertMedia(input.media)
  assertSizes(input.sizes)
  const product = new Product({
    ...input,
    slug: await uniqueSlug(input.slug || input.name),
    sku: input.sku || (await generateSku(input.category)),
    variantGroupId: null, // linked only through linkVariant()
  })
  assertPublishable(product)
  await product.save().catch(duplicateKeyToField)
  await audit({ actor, action: 'product.create', entity: 'product', entityId: product._id, summary: `${product.name} (${product.sku})` })
  return product
}

export async function updateProduct(actor, id, input) {
  const product = await getAdminProduct(id)
  const before = product.toObject()
  if (input.category) await assertCategory(input.category)
  assertPricing({ mrp: input.mrp ?? product.mrp, discount: input.discount ?? product.discount, costPrice: input.costPrice ?? product.costPrice })
  if (input.media) assertMedia(input.media)
  if (input.sizes) assertSizes(input.sizes)
  if (input.slug) input.slug = await uniqueSlug(input.slug, product._id)
  delete input.variantGroupId

  product.set(input)
  assertPublishable(product)
  await product.save().catch(duplicateKeyToField)

  // Clean up photos/videos that were removed from the product
  const kept = new Set(product.media.map((m) => m.publicId).filter(Boolean))
  for (const m of before.media || []) if (m.publicId && !kept.has(m.publicId)) destroyMedia(m)

  const changes = diff(before, product.toObject(), AUDITED)
  const priceChanged = ['mrp', 'discount', 'sellingPrice', 'costPrice'].some((f) => f in changes)
  await audit({
    actor,
    action: priceChanged ? 'product.price_change' : 'product.update',
    entity: 'product',
    entityId: product._id,
    summary: `${product.name} (${product.sku})`,
    changes,
  })
  return product
}

/** FR3.6: archive instead of delete — order history keeps working. */
export async function setArchived(actor, id, archived) {
  const product = await getAdminProduct(id)
  product.status = archived ? 'archived' : 'draft'
  await product.save()
  await audit({
    actor,
    action: archived ? 'product.archive' : 'product.restore',
    entity: 'product',
    entityId: product._id,
    summary: `${product.name} (${product.sku})`,
  })
  return product
}

/** Quick stock edit from the inventory list (overall stock, or per size). */
export async function updateStock(actor, id, { stock, sizes }) {
  const product = await getAdminProduct(id)
  const before = product.toObject()
  if (sizes) {
    for (const { id: sizeId, stock: qty } of sizes) {
      const size = product.sizes.id(sizeId)
      if (!size) throw fieldError('sizes', 'Unknown size')
      size.stock = qty
    }
  } else if (product.sizes.length) {
    throw fieldError('stock', 'This product has sizes — update the stock per size.')
  } else {
    product.stock = stock
  }
  await product.save()
  await audit({
    actor,
    action: 'product.stock',
    entity: 'product',
    entityId: product._id,
    summary: `${product.name} (${product.sku})`,
    changes: diff(before, product.toObject(), ['stock', 'sizes']),
  })
  return product
}

/** FR3.3: show two products together as variants (joins/merges their groups). */
export async function linkVariant(actor, id, otherId, { variantLabel, otherLabel } = {}) {
  if (String(id) === String(otherId)) throw fieldError('productId', 'Choose a different product')
  const [a, b] = await Promise.all([getAdminProduct(id), getAdminProduct(otherId)])
  const group = a.variantGroupId || b.variantGroupId || new mongoose.Types.ObjectId()
  // Merging two existing groups: move everyone in b's group over to a's
  if (a.variantGroupId && b.variantGroupId && !a.variantGroupId.equals(b.variantGroupId)) {
    await Product.updateMany({ variantGroupId: b.variantGroupId }, { $set: { variantGroupId: group } })
  }
  a.variantGroupId = group
  b.variantGroupId = group
  if (variantLabel) a.variantLabel = variantLabel
  if (otherLabel) b.variantLabel = otherLabel
  await Promise.all([a.save(), b.save()])
  await audit({ actor, action: 'product.link_variant', entity: 'product', entityId: a._id, summary: `${a.sku} ↔ ${b.sku}` })
  return listVariants(group, { admin: true })
}

export async function unlinkVariant(actor, id) {
  const product = await getAdminProduct(id)
  const group = product.variantGroupId
  if (!group) return product
  product.variantGroupId = null
  await product.save()
  // A group of one is no group
  const rest = await Product.find({ variantGroupId: group })
  if (rest.length === 1) {
    rest[0].variantGroupId = null
    await rest[0].save()
  }
  await audit({ actor, action: 'product.unlink_variant', entity: 'product', entityId: product._id, summary: product.sku })
  return product
}

export async function getAdminProduct(id) {
  if (!mongoose.isValidObjectId(id)) throw new AppError(404, 'Product not found', 'NOT_FOUND')
  const product = await Product.findById(id)
  if (!product) throw new AppError(404, 'Product not found', 'NOT_FOUND')
  return product
}

export async function listAdminProducts({ q, status, category, lowStock, page = 1, limit = 24 }) {
  const filter = {}
  if (status) filter.status = status
  else filter.status = { $ne: 'archived' }
  if (category) filter.category = category
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i')
    filter.$or = [{ name: rx }, { sku: rx }, { tags: rx }]
  }
  if (lowStock) filter.$expr = { $and: [{ $lte: ['$stock', '$lowStockThreshold'] }, { $ne: ['$madeToOrder', true] }] }
  return paginate(Product.find(filter).sort({ updatedAt: -1 }).populate('category', 'name slug'), filter, page, limit)
}

export function listVariants(groupId, { admin = false } = {}) {
  if (!groupId) return []
  const filter = { variantGroupId: groupId, ...(admin ? {} : { status: 'active' }) }
  return Product.find(filter).sort({ sellingPrice: 1 }).select('name slug sku variantLabel sellingPrice mrp stock madeToOrder media status')
}

// ------------------------------------------------------------------ public

const SORTS = {
  newest: { createdAt: -1 },
  price_asc: { sellingPrice: 1, createdAt: -1 },
  price_desc: { sellingPrice: -1, createdAt: -1 },
  featured: { featured: -1, createdAt: -1 },
}

/** FR1.3 / FR1.5: active products, filtered, sorted and paged. Prices in the query are rupees. */
export async function listPublicProducts({ category, metal, stone, minPrice, maxPrice, inStock, q, sort = 'featured', page = 1, limit = 24 }) {
  const filter = { status: 'active' }
  let categoryInfo = null
  if (category) {
    categoryInfo = await categoryIdsForSlug(category)
    if (!categoryInfo) return { items: [], total: 0, page: 1, pages: 0, category: null }
    filter.category = { $in: categoryInfo.ids }
  } else {
    // Hide products whose collection is switched off
    const hidden = await Category.find({ isActive: false }).select('_id')
    if (hidden.length) filter.category = { $nin: hidden.map((c) => c._id) }
  }
  if (metal?.length) filter.metal = { $in: metal }
  if (stone?.length) filter['stones.gem'] = { $in: stone }
  if (minPrice != null || maxPrice != null) {
    filter.sellingPrice = {}
    if (minPrice != null) filter.sellingPrice.$gte = Math.round(minPrice * 100)
    if (maxPrice != null) filter.sellingPrice.$lte = Math.round(maxPrice * 100)
  }
  if (inStock) filter.$or = [{ stock: { $gt: 0 } }, { madeToOrder: true }]
  if (q) {
    const rx = new RegExp(escapeRegex(q.trim()), 'i')
    const gemHits = GEMS.filter((g) => rx.test(g.name)).map((g) => g.slug)
    const search = [{ name: rx }, { tags: rx }, { description: rx }, ...(gemHits.length ? [{ 'stones.gem': { $in: gemHits } }] : [])]
    filter.$and = [...(filter.$and || []), { $or: search }]
  }

  const query = Product.find(filter)
    .sort(SORTS[sort] || SORTS.featured)
    .select('name slug sellingPrice mrp discount stock madeToOrder media metal stones category variantGroupId variantLabel featured createdAt')
    .populate('category', 'name slug')
  const result = await paginate(query, filter, page, limit)
  return {
    ...result,
    items: result.items.map((p) => cardOf(p)),
    category: categoryInfo?.category.toJSON() ?? null,
  }
}

/** FR1.4: product page — the product, its variants and related pieces. */
export async function getPublicProduct(slug) {
  const product = await Product.findOne({ slug, status: 'active' }).populate('category', 'name slug isActive parent')
  if (!product || product.category?.isActive === false) throw new AppError(404, 'This piece is not available.', 'NOT_FOUND')

  const [variants, related] = await Promise.all([
    listVariants(product.variantGroupId),
    Product.find({ status: 'active', category: product.category._id, _id: { $ne: product._id }, ...(product.variantGroupId && { variantGroupId: { $ne: product.variantGroupId } }) })
      .sort({ featured: -1, createdAt: -1 })
      .limit(8)
      .select('name slug sellingPrice mrp discount stock madeToOrder media metal stones category'),
  ])
  return {
    product: product.toPublic(),
    variants: variants.map((v) => ({ ...cardOf(v), variantLabel: v.variantLabel, current: v._id.equals(product._id) })),
    related: related.map((p) => cardOf(p)),
  }
}

/** Filter options for the collection page: metals/stones actually in use, and the price range. */
export async function catalogMeta() {
  const [stats] = await Product.aggregate([
    { $match: { status: 'active' } },
    {
      $group: {
        _id: null,
        minPrice: { $min: '$sellingPrice' },
        maxPrice: { $max: '$sellingPrice' },
        metals: { $addToSet: '$metal' },
        stones: { $push: '$stones.gem' },
      },
    },
  ])
  const usedStones = new Set((stats?.stones || []).flat())
  const usedMetals = new Set(stats?.metals || [])
  return {
    metals: METALS.filter((m) => usedMetals.has(m.slug)),
    stones: GEMS.filter((g) => usedStones.has(g.slug)).map(({ slug, name, colour }) => ({ slug, name, colour })),
    price: { min: stats ? stats.minPrice / 100 : 0, max: stats ? stats.maxPrice / 100 : 0 },
    allMetals: METALS,
    allStones: GEMS,
  }
}

// ------------------------------------------------------------------ shared

/** The compact shape used on cards/grids. */
function cardOf(p) {
  const cover = p.media?.find((m) => m.type === 'image') || null
  const hover = p.media?.filter((m) => m.type === 'image')[1] || null
  return {
    id: p._id.toString(),
    name: p.name,
    slug: p.slug,
    sellingPrice: p.sellingPrice,
    mrp: p.mrp,
    onSale: p.sellingPrice < p.mrp,
    inStock: p.madeToOrder || p.stock > 0,
    madeToOrder: Boolean(p.madeToOrder),
    cover: cover && { url: cover.url, alt: cover.alt || p.name },
    hover: hover && { url: hover.url, alt: hover.alt || p.name },
    metal: p.metal,
    stones: (p.stones || []).map((s) => s.gem),
    category: p.category?.slug ? { name: p.category.name, slug: p.category.slug } : undefined,
    hasVariants: Boolean(p.variantGroupId),
  }
}

async function paginate(query, filter, page, limit) {
  const size = Math.min(Math.max(Number(limit) || 24, 1), PAGE_MAX)
  const current = Math.max(Number(page) || 1, 1)
  const [items, total] = await Promise.all([query.skip((current - 1) * size).limit(size), Product.countDocuments(filter)])
  return { items, total, page: current, pages: Math.ceil(total / size) }
}

function duplicateKeyToField(err) {
  if (err?.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'sku'
    throw fieldError(field, field === 'sku' ? 'Another product already uses this SKU.' : 'This is already in use.')
  }
  throw err
}
