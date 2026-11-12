import { body, param, query } from 'express-validator'
import { GEM_SLUGS } from '../constants/gems.js'
import { METAL_SLUGS } from '../constants/metals.js'

// Money is whole paise (₹1 = 100). The admin UI converts from rupees.
const paise = (field, { optional = false, min = 0 } = {}) => {
  const chain = body(field)
  return (optional ? chain.optional({ values: 'null' }) : chain)
    .isInt({ min, max: 100_000_000 }).withMessage('Enter an amount in paise (whole number)')
    .toInt()
}
const text = (field, max, { required = false } = {}) => {
  const chain = body(field)
  return (required ? chain : chain.optional({ values: 'null' }))
    .isString().withMessage('Must be text')
    .trim()
    .isLength({ min: required ? 1 : 0, max }).withMessage(required ? `Required (max ${max} characters)` : `Max ${max} characters`)
    .not().matches(/[<>]/).withMessage('Remove the < and > characters')
}
const num = (field, max) => body(field).optional({ values: 'null' }).isFloat({ min: 0, max }).withMessage(`0–${max}`).toFloat()
const bool = (field) => body(field).optional().isBoolean().withMessage('Yes or no').toBoolean()
const mongoId = (field, msg) => body(field).isMongoId().withMessage(msg)

const slugRule = (field = 'slug') =>
  body(field).optional({ values: 'falsy' }).isString().trim().toLowerCase()
    .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).withMessage('Lowercase letters, numbers and dashes only')
    .isLength({ max: 80 })

// ------------------------------------------------------------------ categories

export const categoryRules = (partial = false) => [
  partial ? text('name', 60) : text('name', 60, { required: true }),
  slugRule(),
  body('parent').optional({ values: 'null' }).isMongoId().withMessage('Invalid parent'),
  text('description', 500),
  body('image').optional({ values: 'null' }).isObject().withMessage('Invalid image'),
  body('image.url').optional().isString().isLength({ max: 500 }),
  body('image.publicId').optional().isString().isLength({ max: 300 }),
  text('image.alt', 200),
  body('sortOrder').optional().isInt({ min: -1000, max: 1000 }).toInt(),
  bool('isActive'),
]

// ------------------------------------------------------------------ products

const productBody = (partial) => [
  partial ? text('name', 120) : text('name', 120, { required: true }),
  slugRule(),
  body('sku').optional({ values: 'falsy' }).isString().trim().toUpperCase()
    .matches(/^[A-Z0-9][A-Z0-9-]{1,38}[A-Z0-9]$/).withMessage('3–40 letters, numbers and dashes'),
  text('description', 5000),
  partial ? body('category').optional().isMongoId().withMessage('Choose a collection') : mongoId('category', 'Choose a collection'),
  body('status').optional().isIn(['draft', 'active']).withMessage('Draft or active (use archive to archive)'),

  paise('costPrice', { optional: true }),
  partial ? paise('mrp', { optional: true, min: 100 }) : paise('mrp', { min: 100 }),
  body('discount').optional().isObject().withMessage('Invalid discount'),
  body('discount.type').optional().isIn(['none', 'percent', 'flat']).withMessage('none, percent or flat'),
  body('discount.value').optional().isFloat({ min: 0, max: 100_000_000 }).withMessage('Invalid discount').toFloat(),

  body('stock').optional().isInt({ min: 0, max: 100000 }).withMessage('0 or more').toInt(),
  body('sizes').optional().isArray({ max: 40 }).withMessage('Up to 40 sizes'),
  body('sizes.*.label').isString().trim().isLength({ min: 1, max: 20 }).withMessage('Size label 1–20 characters'),
  body('sizes.*.stock').isInt({ min: 0, max: 100000 }).withMessage('Stock 0 or more').toInt(),
  body('lowStockThreshold').optional().isInt({ min: 0, max: 1000 }).toInt(),
  text('variantLabel', 40),

  body('media').optional().isArray({ max: 15 }).withMessage('Up to 15 photos/videos'),
  body('media.*.type').isIn(['image', 'video']).withMessage('image or video'),
  body('media.*.url').isString().isLength({ min: 1, max: 500 }).withMessage('Invalid media URL'),
  body('media.*.publicId').optional().isString().isLength({ max: 300 }),
  text('media.*.alt', 200),
  body('media.*.width').optional().isInt({ min: 1, max: 20000 }).toInt(),
  body('media.*.height').optional().isInt({ min: 1, max: 20000 }).toInt(),

  body('metal').optional({ values: 'null' }).isIn(METAL_SLUGS).withMessage('Choose a metal'),
  text('purity', 40),
  body('stones').optional().isArray({ max: 20 }).withMessage('Up to 20 stones'),
  body('stones.*.gem').isIn(GEM_SLUGS).withMessage('Choose a stone from the list'),
  text('stones.*.shape', 40),
  text('stones.*.sizeMm', 20),
  body('stones.*.carat').optional({ values: 'null' }).isFloat({ min: 0, max: 1000 }).toFloat(),
  body('stones.*.count').optional().isInt({ min: 1, max: 500 }).toInt(),
  num('weightGrams', 5000),
  num('dimensions.lengthMm', 2000),
  num('dimensions.widthMm', 2000),
  num('dimensions.heightMm', 2000),
  bool('handmade'),
  bool('madeToOrder'),
  body('makingDays').optional({ values: 'null' }).isInt({ min: 0, max: 120 }).toInt(),
  text('careNotes', 1000),
  body('tags').optional().isArray({ max: 20 }).withMessage('Up to 20 tags'),
  body('tags.*').isString().trim().toLowerCase().isLength({ min: 1, max: 30 }).not().matches(/[<>]/),
  bool('featured'),
]

export const createProductRules = productBody(false)
export const updateProductRules = productBody(true)

export const stockRules = [
  body('stock').optional().isInt({ min: 0, max: 100000 }).withMessage('0 or more').toInt(),
  body('sizes').optional().isArray({ max: 40 }),
  body('sizes.*.id').isMongoId(),
  body('sizes.*.stock').isInt({ min: 0, max: 100000 }).withMessage('0 or more').toInt(),
]

export const linkVariantRules = [
  mongoId('productId', 'Choose a product'),
  text('variantLabel', 40),
  text('otherLabel', 40),
]

export const idParam = [param('id').isMongoId().withMessage('Not found')]

export const adminListRules = [
  query('q').optional().isString().trim().isLength({ max: 80 }),
  query('status').optional().isIn(['draft', 'active', 'archived']),
  query('category').optional().isMongoId(),
  query('lowStock').optional().isBoolean().toBoolean(),
  query('page').optional().isInt({ min: 1, max: 1000 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 48 }).toInt(),
]

const list = (field, allowed) =>
  query(field)
    .optional()
    .customSanitizer((v) => (Array.isArray(v) ? v : String(v).split(',')).map((s) => s.trim()).filter(Boolean))
    .custom((arr) => arr.length <= 20 && arr.every((s) => allowed.includes(s)))
    .withMessage('Unknown option')

export const publicListRules = [
  query('category').optional().isString().trim().matches(/^[a-z0-9-]{1,80}$/).withMessage('Unknown collection'),
  list('metal', METAL_SLUGS),
  list('stone', GEM_SLUGS),
  query('minPrice').optional().isFloat({ min: 0, max: 1_000_000 }).toFloat(),
  query('maxPrice').optional().isFloat({ min: 0, max: 1_000_000 }).toFloat(),
  query('inStock').optional().isBoolean().toBoolean(),
  query('q').optional().isString().trim().isLength({ max: 80 }),
  query('sort').optional().isIn(['featured', 'newest', 'price_asc', 'price_desc']),
  query('page').optional().isInt({ min: 1, max: 1000 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 48 }).toInt(),
]

export const slugParam = [param('slug').isString().trim().matches(/^[a-z0-9-]{1,90}$/).withMessage('Not found')]
