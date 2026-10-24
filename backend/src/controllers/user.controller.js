import { matchedData } from 'express-validator'
import { sendSuccess } from '../middleware/errorHandler.js'
import { MAX_ADDRESSES } from '../models/User.js'
import AppError from '../utils/AppError.js'

// FR2.7 customer profile. Every handler works on req.user (loaded from the session),
// so a customer can only ever touch their own profile/addresses (SEC-11).

export async function getProfile(req, res) {
  sendSuccess(res, { user: req.user })
}

export async function updateProfile(req, res) {
  const updates = matchedData(req) // only whitelisted fields; email/role/status can't be changed here
  Object.assign(req.user, updates)
  await req.user.save()
  sendSuccess(res, { user: req.user })
}

function applyDefault(user, address) {
  if (address.isDefault || user.addresses.length === 1) {
    user.addresses.forEach((a) => {
      a.isDefault = a._id.equals(address._id)
    })
  }
}

export async function addAddress(req, res) {
  const user = req.user
  if (user.addresses.length >= MAX_ADDRESSES) {
    throw new AppError(400, `You can save up to ${MAX_ADDRESSES} addresses.`, 'ADDRESS_LIMIT')
  }
  user.addresses.push(matchedData(req))
  applyDefault(user, user.addresses.at(-1))
  await user.save()
  sendSuccess(res, { addresses: user.addresses }, undefined, 201)
}

function findAddress(user, addressId) {
  const address = user.addresses.id(addressId)
  if (!address) throw new AppError(404, 'Address not found', 'ADDRESS_NOT_FOUND')
  return address
}

export async function updateAddress(req, res) {
  const { addressId, ...fields } = matchedData(req)
  const address = findAddress(req.user, addressId)
  address.set(fields)
  applyDefault(req.user, address)
  await req.user.save()
  sendSuccess(res, { addresses: req.user.addresses })
}

export async function deleteAddress(req, res) {
  const { addressId } = matchedData(req)
  const address = findAddress(req.user, addressId)
  const wasDefault = address.isDefault
  address.deleteOne()
  if (wasDefault && req.user.addresses.length) req.user.addresses[0].isDefault = true
  await req.user.save()
  sendSuccess(res, { addresses: req.user.addresses })
}
