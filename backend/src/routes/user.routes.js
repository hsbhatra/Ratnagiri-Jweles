import { Router } from 'express'
import * as ctrl from '../controllers/user.controller.js'
import { authenticate } from '../middleware/auth.js'
import validate from '../middleware/validate.js'
import * as v from '../validators/user.validators.js'

const router = Router()
router.use(authenticate)

router.get('/me', ctrl.getProfile)
router.patch('/me', v.updateProfileRules, validate, ctrl.updateProfile)
router.post('/me/addresses', v.addressRules, validate, ctrl.addAddress)
router.put('/me/addresses/:addressId', v.addressIdParam, v.addressRules, validate, ctrl.updateAddress)
router.delete('/me/addresses/:addressId', v.addressIdParam, validate, ctrl.deleteAddress)

export default router
