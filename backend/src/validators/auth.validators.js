import { body, param } from 'express-validator'

// bcrypt only uses the first 72 bytes, so cap there rather than silently truncating.
export const passwordRule = (field = 'password') =>
  body(field)
    .isString().withMessage('Password is required')
    .isLength({ min: 8, max: 72 }).withMessage('Password must be 8–72 characters')
    .matches(/[A-Za-z]/).withMessage('Password must include a letter')
    .matches(/\d/).withMessage('Password must include a number')

const emailRule = () =>
  body('email')
    .isString().withMessage('Email is required')
    .trim()
    .isEmail().withMessage('Enter a valid email address')
    .isLength({ max: 254 })

const codeRule = () =>
  body('code').isString().withMessage('Code is required').trim().matches(/^\d{6}$/).withMessage('Enter the 6-digit code')

const registrationTokenRule = () =>
  body('registrationToken').isString().withMessage('Registration expired').isLength({ min: 10, max: 100 })

export const registerRules = [
  body('name').isString().withMessage('Name is required').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),
  emailRule(),
  body('phone')
    .isString().withMessage('Phone number is required')
    .customSanitizer((v) => String(v).replace(/[\s()-]/g, ''))
    .matches(/^\+?[1-9]\d{7,14}$/).withMessage('Enter a valid phone number with country code, e.g. +91 98765 43210'),
  passwordRule(),
]

export const verifyRegistrationRules = [emailRule(), codeRule(), registrationTokenRule()]
export const resendOtpRules = [emailRule(), registrationTokenRule()]

export const loginRules = [
  emailRule(),
  body('password').isString().withMessage('Password is required').isLength({ min: 1, max: 200 }),
  body('revokeSessionId').optional().isMongoId().withMessage('Invalid session'),
]

export const forgotPasswordRules = [emailRule()]
export const resetPasswordRules = [emailRule(), codeRule(), passwordRule('newPassword')]

export const sessionIdParam = [param('id').isMongoId().withMessage('Invalid session')]
