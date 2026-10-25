import { Router } from 'express'
import * as ctrl from '../controllers/user.controller.js'
import { authenticate } from '../middleware/auth.js'
import { passwordCheckLimiter } from '../middleware/rateLimiters.js'
import validate from '../middleware/validate.js'
import { deleteAccountRules } from '../validators/auth.validators.js'
import * as v from '../validators/user.validators.js'

const router = Router()
router.use(authenticate)

router.get('/me', ctrl.getProfile)
router.patch('/me', v.updateProfileRules, validate, ctrl.updateProfile)
router.delete('/me', passwordCheckLimiter, deleteAccountRules, validate, ctrl.deleteAccount)
router.post('/me/addresses', v.addressRules, validate, ctrl.addAddress)
router.put('/me/addresses/:addressId', v.addressIdParam, v.addressRules, validate, ctrl.updateAddress)
router.delete('/me/addresses/:addressId', v.addressIdParam, validate, ctrl.deleteAddress)

export default router
