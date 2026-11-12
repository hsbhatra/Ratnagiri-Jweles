import { Router } from 'express'
import * as ctrl from '../controllers/catalog.controller.js'
import validate from '../middleware/validate.js'
import * as v from '../validators/catalog.validators.js'

const router = Router()
router.get('/categories', ctrl.categories)
router.get('/catalog/meta', ctrl.meta)
router.get('/products', v.publicListRules, validate, ctrl.products)
router.get('/products/:slug', v.slugParam, validate, ctrl.product)
export default router
