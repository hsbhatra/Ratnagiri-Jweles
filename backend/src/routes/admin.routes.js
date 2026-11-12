import { Router } from 'express'
import * as ctrl from '../controllers/admin.catalog.controller.js'
import { authenticate, authorize } from '../middleware/auth.js'
import validate from '../middleware/validate.js'
import * as v from '../validators/catalog.validators.js'

// FR2.8 / NFR-S10: same login, admin role checked from the database on every request
const router = Router()
router.use(authenticate, authorize('admin'))
// Admin data is personal/commercial: never cache it anywhere
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
})

router.get('/categories', ctrl.listCategories)
router.post('/categories', v.categoryRules(), validate, ctrl.createCategory)
router.patch('/categories/:id', v.idParam, v.categoryRules(true), validate, ctrl.updateCategory)
router.delete('/categories/:id', v.idParam, validate, ctrl.deleteCategory)

router.get('/products', v.adminListRules, validate, ctrl.listProducts)
router.post('/products', v.createProductRules, validate, ctrl.createProduct)
router.get('/products/:id', v.idParam, validate, ctrl.getProduct)
router.patch('/products/:id', v.idParam, v.updateProductRules, validate, ctrl.updateProduct)
router.post('/products/:id/archive', v.idParam, validate, ctrl.archiveProduct)
router.post('/products/:id/restore', v.idParam, validate, ctrl.restoreProduct)
router.patch('/products/:id/stock', v.idParam, v.stockRules, validate, ctrl.updateStock)
router.post('/products/:id/variants', v.idParam, v.linkVariantRules, validate, ctrl.linkVariant)
router.delete('/products/:id/variants', v.idParam, validate, ctrl.unlinkVariant)

router.post('/media/signature', ctrl.mediaSignature)
router.get('/audit-log', ctrl.auditLog)
export default router
