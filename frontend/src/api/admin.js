import apiClient from '../lib/apiClient'

const data = (p) => p.then((res) => res.data)
const withMeta = (p) => p.then((res) => ({ ...res.data, meta: res.meta }))

export const adminApi = {
  categories: () => data(apiClient.get('/v1/admin/categories')),
  createCategory: (body) => data(apiClient.post('/v1/admin/categories', body)),
  updateCategory: (id, body) => data(apiClient.patch(`/v1/admin/categories/${id}`, body)),
  deleteCategory: (id) => data(apiClient.delete(`/v1/admin/categories/${id}`)),

  products: (params) => withMeta(apiClient.get('/v1/admin/products', { params })),
  product: (id) => data(apiClient.get(`/v1/admin/products/${id}`)),
  createProduct: (body) => data(apiClient.post('/v1/admin/products', body)),
  updateProduct: (id, body) => data(apiClient.patch(`/v1/admin/products/${id}`, body)),
  archive: (id) => data(apiClient.post(`/v1/admin/products/${id}/archive`)),
  restore: (id) => data(apiClient.post(`/v1/admin/products/${id}/restore`)),
  updateStock: (id, body) => data(apiClient.patch(`/v1/admin/products/${id}/stock`, body)),
  linkVariant: (id, body) => data(apiClient.post(`/v1/admin/products/${id}/variants`, body)),
  unlinkVariant: (id) => data(apiClient.delete(`/v1/admin/products/${id}/variants`)),

  mediaSignature: () => data(apiClient.post('/v1/admin/media/signature')),
  auditLog: (params) => data(apiClient.get('/v1/admin/audit-log', { params })),
}

export const catalogApi = {
  meta: () => data(apiClient.get('/v1/catalog/meta')),
  categories: () => data(apiClient.get('/v1/categories')),
  products: (params) => withMeta(apiClient.get('/v1/products', { params })),
  product: (slug) => data(apiClient.get(`/v1/products/${slug}`)),
}
