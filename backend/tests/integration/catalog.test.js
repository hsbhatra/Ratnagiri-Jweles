/**
 * Module 3 — catalog & inventory against a real MongoDB (mongodb-memory-server).
 * Covers FR3.1–FR3.6, FR1.3–FR1.5, NFR-S10 (admin-only) and NFR-S12 (audit log).
 */
import bcrypt from 'bcryptjs'
import request from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import app from '../../src/app.js'
import AuditLog from '../../src/models/AuditLog.js'
import User from '../../src/models/User.js'
import { startDb } from '../helpers/db.js'

const db = await startDb()
const PASSWORD = 'Handcrafted123'
const IMG = '/media/test/ring.webp' // local path allowed while Cloudinary isn't configured (tests/dev)

async function signedIn(role) {
  const email = `${role}-${Math.random().toString(36).slice(2, 8)}@example.com`
  await User.create({ name: role === 'admin' ? 'Owner' : 'Asha', email, phone: '+919876543210', role, status: 'active', passwordHash: await bcrypt.hash(PASSWORD, 4) })
  const agent = request.agent(app)
  const res = await agent.post('/api/v1/auth/login').send({ email, password: PASSWORD })
  expect(res.status).toBe(200)
  return agent
}

const baseProduct = (category, over = {}) => ({
  name: 'Citrine Halo Ring',
  description: 'Hand-set citrine in 925 sterling silver.',
  category,
  mrp: 450000, // ₹4,500
  costPrice: 150000,
  discount: { type: 'percent', value: 10 },
  stock: 5,
  metal: '925-sterling-silver',
  stones: [{ gem: 'citrine', shape: 'oval', sizeMm: '8x6' }],
  media: [{ type: 'image', url: IMG, alt: 'Citrine ring' }],
  ...over,
})

describe.skipIf(!db)('catalog (integration)', () => {
  let admin, rings, earrings
  beforeEach(async () => {
    await db.reset()
    admin = await signedIn('admin')
    rings = (await admin.post('/api/v1/admin/categories').send({ name: 'Rings' })).body.data.category
    earrings = (await admin.post('/api/v1/admin/categories').send({ name: 'Earrings' })).body.data.category
  })
  afterAll(async () => db?.stop())

  describe('admin access (NFR-S10)', () => {
    it('refuses guests (401) and customers (403) on every admin route', async () => {
      const customer = await signedIn('customer')
      for (const [method, path] of [['get', '/api/v1/admin/products'], ['post', '/api/v1/admin/products'], ['post', '/api/v1/admin/categories'], ['post', '/api/v1/admin/media/signature']]) {
        expect((await request(app)[method](path).send({})).status).toBe(401)
        expect((await customer[method](path).send({})).status).toBe(403)
      }
    })
  })

  describe('categories (FR3.4)', () => {
    it('nests one level, refuses deeper nesting and deleting a collection in use', async () => {
      const stack = await admin.post('/api/v1/admin/categories').send({ name: 'Stackable Rings', parent: rings.id })
      expect(stack.status).toBe(201)
      const deeper = await admin.post('/api/v1/admin/categories').send({ name: 'Thin', parent: stack.body.data.category.id })
      expect(deeper.status).toBe(422)

      const tree = (await request(app).get('/api/v1/categories')).body.data.categories
      expect(tree.find((c) => c.slug === 'rings').children.map((c) => c.slug)).toEqual(['stackable-rings'])

      expect((await admin.delete(`/api/v1/admin/categories/${rings.id}`)).status).toBe(409) // has a child
      await admin.post('/api/v1/admin/products').send(baseProduct(earrings.id))
      expect((await admin.delete(`/api/v1/admin/categories/${earrings.id}`)).status).toBe(409) // has a product
    })
  })

  describe('products (FR3.1, FR3.6)', () => {
    it('derives the selling price, generates slug + SKU, and hides cost price from shoppers', async () => {
      const res = await admin.post('/api/v1/admin/products').send({ ...baseProduct(rings.id), status: 'active' })
      expect(res.status).toBe(201)
      const p = res.body.data.product
      expect(p).toMatchObject({ slug: 'citrine-halo-ring', sellingPrice: 405000, costPrice: 150000 })
      expect(p.sku).toMatch(/^RG-RING-[A-Z0-9]{5}$/)

      const pub = await request(app).get('/api/v1/products/citrine-halo-ring')
      expect(pub.status).toBe(200)
      expect(pub.body.data.product.costPrice).toBeUndefined()
      expect(JSON.stringify(pub.body)).not.toContain('150000')
    })

    it('rejects bad pricing, duplicate SKUs, foreign media and client-set fields', async () => {
      expect((await admin.post('/api/v1/admin/products').send(baseProduct(rings.id, { discount: { type: 'percent', value: 95 } }))).status).toBe(422)
      expect((await admin.post('/api/v1/admin/products').send(baseProduct(rings.id, { discount: { type: 'flat', value: 450000 } }))).status).toBe(422)
      expect((await admin.post('/api/v1/admin/products').send(baseProduct(rings.id, { mrp: -5 }))).status).toBe(422)
      expect((await admin.post('/api/v1/admin/products').send(baseProduct(rings.id, { media: [{ type: 'image', url: 'javascript:alert(1)' }] }))).status).toBe(422)

      await admin.post('/api/v1/admin/products').send(baseProduct(rings.id, { sku: 'RG-R-001' }))
      const dup = await admin.post('/api/v1/admin/products').send(baseProduct(rings.id, { sku: 'rg-r-001' }))
      expect(dup.status).toBe(422)
      expect(dup.body.error.details.fields.sku).toBeTruthy()

      const sneaky = await admin.post('/api/v1/admin/products').send(baseProduct(rings.id, { sellingPrice: 100, variantGroupId: '6a0000000000000000000000', status: 'archived' }))
      expect(sneaky.status).toBe(422) // archived only via /archive
      const ok = await admin.post('/api/v1/admin/products').send(baseProduct(rings.id, { sellingPrice: 100, variantGroupId: '6a0000000000000000000000' }))
      expect(ok.body.data.product.sellingPrice).toBe(405000)
      expect(ok.body.data.product.variantGroupId).toBeNull()
    })

    it('refuses to publish without a photo and description', async () => {
      const res = await admin.post('/api/v1/admin/products').send(baseProduct(rings.id, { status: 'active', media: [], description: '' }))
      expect(res.status).toBe(422)
    })

    it('archives instead of deleting: gone from the shop, kept for admin', async () => {
      const p = (await admin.post('/api/v1/admin/products').send({ ...baseProduct(rings.id), status: 'active' })).body.data.product
      await admin.post(`/api/v1/admin/products/${p.id}/archive`)
      expect((await request(app).get(`/api/v1/products/${p.slug}`)).status).toBe(404)
      expect((await request(app).get('/api/v1/products')).body.data.products).toHaveLength(0)
      expect((await admin.get(`/api/v1/admin/products/${p.id}`)).body.data.product.status).toBe('archived')
      await admin.post(`/api/v1/admin/products/${p.id}/restore`)
      expect((await admin.get(`/api/v1/admin/products/${p.id}`)).body.data.product.status).toBe('draft')
    })
  })

  describe('inventory (FR3.5)', () => {
    it('keeps stock = sum of sizes, flags low stock and treats 0 as out of stock', async () => {
      const p = (await admin.post('/api/v1/admin/products').send({
        ...baseProduct(rings.id),
        status: 'active',
        sizes: [{ label: 'US 6', stock: 1 }, { label: 'US 7', stock: 1 }],
      })).body.data.product
      expect(p.stock).toBe(2)
      expect(p.lowStock).toBe(true)

      const low = await admin.get('/api/v1/admin/products?lowStock=true')
      expect(low.body.data.products.map((x) => x.id)).toContain(p.id)

      const sizes = p.sizes.map((s) => ({ id: s.id || s._id, stock: 0 }))
      const zero = await admin.patch(`/api/v1/admin/products/${p.id}/stock`).send({ sizes })
      expect(zero.body.data.product.stock).toBe(0)
      const card = (await request(app).get('/api/v1/products')).body.data.products[0]
      expect(card.inStock).toBe(false)

      const dupSizes = await admin.patch(`/api/v1/admin/products/${p.id}`).send({ sizes: [{ label: 'US 6', stock: 1 }, { label: 'us 6', stock: 1 }] })
      expect(dupSizes.status).toBe(422)
    })
  })

  describe('variants (FR3.3)', () => {
    it('links products into one group shown together on the product page', async () => {
      const a = (await admin.post('/api/v1/admin/products').send({ ...baseProduct(rings.id), status: 'active' })).body.data.product
      const b = (await admin.post('/api/v1/admin/products').send({ ...baseProduct(rings.id, { name: 'Amethyst Halo Ring', stones: [{ gem: 'amethyst' }] }), status: 'active' })).body.data.product
      const link = await admin.post(`/api/v1/admin/products/${a.id}/variants`).send({ productId: b.id, variantLabel: 'Citrine', otherLabel: 'Amethyst' })
      expect(link.body.data.variants).toHaveLength(2)

      const page = (await request(app).get(`/api/v1/products/${a.slug}`)).body.data
      expect(page.variants.map((v) => v.variantLabel).sort()).toEqual(['Amethyst', 'Citrine'])
      expect(page.variants.find((v) => v.current).slug).toBe(a.slug)
      expect(page.related.map((r) => r.slug)).not.toContain(b.slug) // variants aren't "related"

      await admin.delete(`/api/v1/admin/products/${a.id}/variants`)
      expect((await request(app).get(`/api/v1/products/${b.slug}`)).body.data.variants).toHaveLength(0)
    })
  })

  describe('storefront listing (FR1.3, FR1.5)', () => {
    beforeEach(async () => {
      const add = (over) => admin.post('/api/v1/admin/products').send({ ...baseProduct(rings.id), status: 'active', ...over })
      await add({ name: 'Citrine Halo Ring', mrp: 450000, discount: { type: 'none', value: 0 } })
      await add({ name: 'Amethyst Band', mrp: 250000, discount: { type: 'none', value: 0 }, stones: [{ gem: 'amethyst' }] })
      await add({ name: 'Plain Silver Band', mrp: 150000, discount: { type: 'none', value: 0 }, stones: [], stock: 0 })
      await add({ name: 'Draft Ring', status: 'draft' })
      await admin.post('/api/v1/admin/products').send({ ...baseProduct(earrings.id, { name: 'Topaz Studs', stones: [{ gem: 'london-blue-topaz' }] }), status: 'active' })
    })
    const names = (res) => res.body.data.products.map((p) => p.name)

    it('filters by collection, stone, price and stock; never shows drafts', async () => {
      expect(names(await request(app).get('/api/v1/products?category=rings')).sort()).toEqual(['Amethyst Band', 'Citrine Halo Ring', 'Plain Silver Band'])
      expect(names(await request(app).get('/api/v1/products?stone=amethyst'))).toEqual(['Amethyst Band'])
      expect(names(await request(app).get('/api/v1/products?category=rings&minPrice=2000&maxPrice=3000'))).toEqual(['Amethyst Band'])
      expect(names(await request(app).get('/api/v1/products?category=rings&inStock=true'))).not.toContain('Plain Silver Band')
      expect(names(await request(app).get('/api/v1/products'))).not.toContain('Draft Ring')
    })

    it('sorts by price and searches names and stone names (case-insensitive, regex-safe)', async () => {
      expect(names(await request(app).get('/api/v1/products?category=rings&sort=price_asc'))).toEqual(['Plain Silver Band', 'Amethyst Band', 'Citrine Halo Ring'])
      expect(names(await request(app).get('/api/v1/products?q=TOPAZ'))).toEqual(['Topaz Studs'])
      expect(names(await request(app).get('/api/v1/products?q=london blue'))).toEqual(['Topaz Studs'])
      expect((await request(app).get('/api/v1/products?q=.*')).body.data.products).toHaveLength(0)
      expect((await request(app).get('/api/v1/products?q=(((')).status).toBe(200)
    })

    it('rejects junk filters and caps the page size', async () => {
      expect((await request(app).get('/api/v1/products?stone=kryptonite')).status).toBe(422)
      // Express 5's simple query parser never builds objects, so operator keys are just ignored text
      expect((await request(app).get('/api/v1/products?category[$ne]=x')).status).toBe(200)
      expect((await request(app).get('/api/v1/products?limit=1000')).status).toBe(422)
      const unknown = await request(app).get('/api/v1/products?category=no-such-collection')
      expect(unknown.body.data.products).toEqual([])
    })

    it('hides a switched-off collection and its products', async () => {
      await admin.patch(`/api/v1/admin/categories/${earrings.id}`).send({ isActive: false })
      expect(names(await request(app).get('/api/v1/products'))).not.toContain('Topaz Studs')
      expect((await request(app).get('/api/v1/products/topaz-studs')).status).toBe(404)
    })

    it('reports only filters that are in use', async () => {
      const meta = (await request(app).get('/api/v1/catalog/meta')).body.data
      expect(meta.stones.map((s) => s.slug).sort()).toEqual(['amethyst', 'citrine', 'london-blue-topaz'])
      expect(meta.price).toEqual({ min: 1500, max: 4500 })
    })
  })

  describe('audit log (NFR-S12)', () => {
    it('records who changed a price, with before/after', async () => {
      const p = (await admin.post('/api/v1/admin/products').send(baseProduct(rings.id))).body.data.product
      await admin.patch(`/api/v1/admin/products/${p.id}`).send({ mrp: 500000 })
      const entry = await AuditLog.findOne({ action: 'product.price_change' })
      expect(entry.changes.mrp).toEqual({ from: 450000, to: 500000 })
      expect(entry.changes.sellingPrice).toEqual({ from: 405000, to: 450000 })
      expect(entry.actorEmail).toMatch(/^admin-/)
    })
  })
})
