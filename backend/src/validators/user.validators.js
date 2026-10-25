import { body, param } from 'express-validator'
import { SUPPORTED_CURRENCIES } from '../models/User.js'
import { nameRule, phoneRule as phone } from './auth.validators.js'

export const updateProfileRules = [
  nameRule(true),
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
    // Addresses are printed on invoices and labels later; markup has no business in them
    .not().matches(/[<>]/).withMessage('Remove the < and > characters')
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
