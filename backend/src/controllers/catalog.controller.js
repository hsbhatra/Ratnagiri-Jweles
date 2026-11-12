import { matchedData } from 'express-validator'
import { sendSuccess } from '../middleware/errorHandler.js'
import { categoryTree } from '../services/category.service.js'
import { catalogMeta, getPublicProduct, listPublicProducts } from '../services/product.service.js'

// Public storefront reads (FR1.3–FR1.5). Short CDN/browser caching keeps them fast.
const cache = (res, seconds = 60) => res.set('Cache-Control', `public, max-age=${seconds}`)

export async function categories(req, res) {
  cache(res, 300)
  sendSuccess(res, { categories: await categoryTree() })
}

export async function products(req, res) {
  cache(res)
  const { items, ...meta } = await listPublicProducts(matchedData(req, { locations: ['query'] }))
  sendSuccess(res, { products: items, category: meta.category }, { total: meta.total, page: meta.page, pages: meta.pages })
}

export async function product(req, res) {
  cache(res)
  sendSuccess(res, await getPublicProduct(req.params.slug))
}

export async function meta(req, res) {
  cache(res, 300)
  sendSuccess(res, await catalogMeta())
}
