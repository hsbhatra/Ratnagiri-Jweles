import { body, param } from 'express-validator'

// Letters (any script), spaces and . ' - only: a name ends up in emails we send, so it must
// not be able to carry links or markup (otherwise sign-up becomes a spam relay). A dot is
// only allowed before a space or at the end ("J. R. Sharma", "Jr."), never inside a word.
export const nameRule = (optional = false) => {
  const chain = body('name')
  return (optional ? chain.optional() : chain)
    .isString().withMessage('Name is required')
    .trim()
    .customSanitizer((v) => String(v).replace(/\s+/g, ' '))
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters')
    .matches(/^[\p{L}\p{M}](?:[\p{L}\p{M} '’-]|\.(?= |$))*$/u).withMessage('Use letters only (spaces, . \' - allowed)')
}

// International format with country code, e.g. +91 98765 43210 (couriers abroad need it).
export const phoneRule = (field = 'phone', optional = false) => {
  const chain = body(field)
  return (optional ? chain.optional() : chain)
    .isString().withMessage('Phone number is required')
    .customSanitizer((v) => String(v).replace(/[\s()-]/g, ''))
    .matches(/^\+[1-9]\d{7,14}$/).withMessage('Enter your number with country code, e.g. +91 98765 43210')
}

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
  nameRule(),
  emailRule(),
  phoneRule(),
  passwordRule(),
]

export const verifyRegistrationRules = [emailRule(), codeRule(), registrationTokenRule()]
export const resendOtpRules = [emailRule(), registrationTokenRule()]

export const loginRules = [
  emailRule(),
  body('password').isString().withMessage('Password is required').isLength({ min: 1, max: 200 }).withMessage('Password is required'),
  body('revokeSessionId').optional().isMongoId().withMessage('Invalid session'),
]

export const forgotPasswordRules = [emailRule()]
export const resetPasswordRules = [emailRule(), codeRule(), passwordRule('newPassword')]

export const sessionIdParam = [param('id').isMongoId().withMessage('Invalid session')]

const currentPassword = (field) =>
  body(field).isString().withMessage('Enter your current password').isLength({ min: 1, max: 200 }).withMessage('Enter your current password')

export const changePasswordRules = [currentPassword('currentPassword'), passwordRule('newPassword')]
export const deleteAccountRules = [currentPassword('password')]
