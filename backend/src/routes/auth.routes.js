import { Router } from 'express'
import * as ctrl from '../controllers/auth.controller.js'
import { authenticate } from '../middleware/auth.js'
import { loginLimiter, otpSendLimiter, otpVerifyLimiter, passwordCheckLimiter } from '../middleware/rateLimiters.js'
import validate from '../middleware/validate.js'
import * as v from '../validators/auth.validators.js'

const router = Router()

// Public
router.post('/register', otpSendLimiter, v.registerRules, validate, ctrl.register)
router.post('/resend-otp', otpSendLimiter, v.resendOtpRules, validate, ctrl.resendOtp)
router.post('/verify-email', otpVerifyLimiter, v.verifyRegistrationRules, validate, ctrl.verifyRegistration)
router.post('/login', loginLimiter, v.loginRules, validate, ctrl.login)
router.post('/refresh', ctrl.refresh)
router.post('/forgot-password', otpSendLimiter, v.forgotPasswordRules, validate, ctrl.forgotPassword)
router.post('/reset-password', otpVerifyLimiter, v.resetPasswordRules, validate, ctrl.resetPassword)

// Authenticated
router.get('/me', authenticate, ctrl.me)
router.post('/logout', authenticate, ctrl.logout)
router.post('/logout-all', authenticate, ctrl.logoutAll)
router.get('/sessions', authenticate, ctrl.listSessions)
router.delete('/sessions/:id', authenticate, v.sessionIdParam, validate, ctrl.revokeSession)
router.post('/change-password', authenticate, passwordCheckLimiter, v.changePasswordRules, validate, ctrl.changePassword)

export default router
