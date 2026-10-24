import { body, param } from 'express-validator'
import { SUPPORTED_CURRENCIES } from '../models/User.js'

const phone = (field, optional = false) => {
  const chain = body(field)
  return (optional ? chain.optional() : chain)
    .isString().withMessage('Phone number is required')
    .customSanitizer((v) => String(v).replace(/[\s()-]/g, ''))
    .matches(/^\+?[1-9]\d{7,14}$/).withMessage('Enter a valid phone number with country code')
}

export const updateProfileRules = [
  body('name').optional().isString().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),
  phone('phone', true),
  body('preferredCurrency')
    .optional({ values: 'null' })
    .isIn(SUPPORTED_CURRENCIES).withMessage('Unsupported currency'),
]

const str = (field, max, required = true) => {
  const chain = body(field)
  return (required ? chain : chain.optional({ values: 'falsy' }))
    .isString().withMessage('Required')
    .trim()
    .notEmpty().withMessage('Required')
    .isLength({ max }).withMessage(`Max ${max} characters`)
}

export const addressRules = [
  str('label', 40, false),
  str('fullName', 100),
  phone('phone'),
  str('line1', 200),
  str('line2', 200, false),
  str('city', 100),
  str('state', 100, false),
  str('postalCode', 20),
  body('country').isString().trim().isISO31661Alpha2().withMessage('Choose a country').toUpperCase(),
  body('isDefault').optional().isBoolean().toBoolean(),
]

export const addressIdParam = [param('addressId').isMongoId().withMessage('Invalid address')]
