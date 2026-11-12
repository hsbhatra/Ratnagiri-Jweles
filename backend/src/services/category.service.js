import Category from '../models/Category.js'
import Product from '../models/Product.js'
import AppError from '../utils/AppError.js'
import slugify from '../utils/slugify.js'
import { audit, diff } from './audit.service.js'

const FIELDS = ['name', 'slug', 'parent', 'description', 'image', 'sortOrder', 'isActive']

async function uniqueSlug(base, excludeId) {
  const root = slugify(base) || 'collection'
  for (let i = 1; i < 100; i++) {
    const slug = i === 1 ? root : `${root}-${i}`
    const clash = await Category.exists({ slug, ...(excludeId && { _id: { $ne: excludeId } }) })
    if (!clash) return slug
  }
  throw new AppError(409, 'Could not create a unique link name for this collection.', 'SLUG_TAKEN')
}

/** One level of nesting only: a parent must itself be top-level, and not the category itself. */
async function assertParent(parentId, selfId) {
  if (!parentId) return null
  if (selfId && String(parentId) === String(selfId)) {
    throw new AppError(422, 'A collection cannot be inside itself.', 'VALIDATION_ERROR', { fields: { parent: 'Choose a different parent' } })
  }
  const parent = await Category.findById(parentId)
  if (!parent) throw new AppError(422, 'Parent collection not found.', 'VALIDATION_ERROR', { fields: { parent: 'Parent not found' } })
  if (parent.parent) {
    throw new AppError(422, 'Sub-collections can only go one level deep.', 'VALIDATION_ERROR', {
      fields: { parent: 'Choose a top-level collection' },
    })
  }
  if (selfId && (await Category.exists({ parent: selfId }))) {
    throw new AppError(422, 'This collection has sub-collections, so it must stay top-level.', 'VALIDATION_ERROR', {
      fields: { parent: 'Move its sub-collections first' },
    })
  }
  return parent._id
}

/** Public tree: active collections with their active children, in display order. */
export async function categoryTree({ includeInactive = false } = {}) {
  const filter = includeInactive ? {} : { isActive: true }
  const all = await Category.find(filter).sort({ sortOrder: 1, name: 1 })
  const top = all.filter((c) => !c.parent)
  return top.map((c) => ({
    ...c.toJSON(),
    children: all.filter((k) => String(k.parent) === String(c._id)).map((k) => k.toJSON()),
  }))
}

/** Slug → the category id plus its children's ids (a parent's page shows its sub-collections' pieces). */
export async function categoryIdsForSlug(slug) {
  const cat = await Category.findOne({ slug, isActive: true })
  if (!cat) return null
  const children = await Category.find({ parent: cat._id, isActive: true }).select('_id')
  return { category: cat, ids: [cat._id, ...children.map((c) => c._id)] }
}

export async function createCategory(actor, input) {
  const parent = await assertParent(input.parent)
  const category = await Category.create({
    ...input,
    parent,
    slug: await uniqueSlug(input.slug || input.name),
  })
  await audit({ actor, action: 'category.create', entity: 'category', entityId: category._id, summary: category.name })
  return category
}

export async function updateCategory(actor, id, input) {
  const category = await Category.findById(id)
  if (!category) throw new AppError(404, 'Collection not found', 'NOT_FOUND')
  const before = category.toObject()
  if ('parent' in input) input.parent = await assertParent(input.parent, category._id)
  if (input.slug) input.slug = await uniqueSlug(input.slug, category._id)
  category.set(input)
  await category.save()
  await audit({
    actor,
    action: 'category.update',
    entity: 'category',
    entityId: category._id,
    summary: category.name,
    changes: diff(before, category.toObject(), FIELDS),
  })
  return category
}

export async function deleteCategory(actor, id) {
  const category = await Category.findById(id)
  if (!category) throw new AppError(404, 'Collection not found', 'NOT_FOUND')
  if (await Category.exists({ parent: id })) {
    throw new AppError(409, 'Move or delete its sub-collections first.', 'CATEGORY_IN_USE')
  }
  if (await Product.exists({ category: id })) {
    throw new AppError(409, 'Products (including archived ones) are in this collection. Move them, or hide the collection instead.', 'CATEGORY_IN_USE')
  }
  await category.deleteOne()
  await audit({ actor, action: 'category.delete', entity: 'category', entityId: category._id, summary: category.name })
}
