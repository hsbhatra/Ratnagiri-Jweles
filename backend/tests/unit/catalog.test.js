import { describe, expect, it } from 'vitest'
import { computeSellingPrice } from '../../src/models/Product.js'
import { signParams } from '../../src/services/media.service.js'
import slugify, { escapeRegex } from '../../src/utils/slugify.js'

describe('catalog helpers', () => {
  it('derives selling price in whole rupees from MRP and discount', () => {
    expect(computeSellingPrice(450000, { type: 'none', value: 0 })).toBe(450000)
    expect(computeSellingPrice(450000, { type: 'percent', value: 10 })).toBe(405000)
    expect(computeSellingPrice(199900, { type: 'percent', value: 15 })).toBe(169900) // 1699.15 → 1699
    expect(computeSellingPrice(450000, { type: 'flat', value: 50000 })).toBe(400000)
    expect(computeSellingPrice(10000, { type: 'flat', value: 99999 })).toBe(100) // never below ₹1
  })

  it('makes clean, URL-safe slugs', () => {
    expect(slugify('Citrine Halo Ring – Size 7')).toBe('citrine-halo-ring-size-7')
    expect(slugify('  Pendant: Émeraude!! ')).toBe('pendant-emeraude')
    expect(slugify('<script>')).toBe('script')
  })

  it('escapes search text so it cannot act as a regex', () => {
    expect(new RegExp(escapeRegex('.*')).test('anything')).toBe(false)
    expect(() => new RegExp(escapeRegex('((('))).not.toThrow()
  })

  it('signs Cloudinary params the documented way (sorted, &-joined, + secret, sha1)', () => {
    // Example from Cloudinary's signature docs
    expect(signParams({ timestamp: 1315060510, public_id: 'sample_image', eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop' }, 'abcd')).toBe(
      'bfd09f95f331f558cbd1320e67aa8d488770583e'
    )
  })
})
