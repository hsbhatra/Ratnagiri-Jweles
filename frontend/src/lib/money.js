// The API stores and sends money as whole paise (₹1 = 100 paise); people type rupees.
export const toPaise = (rupees) => (rupees === '' || rupees == null ? null : Math.round(Number(rupees) * 100))
export const toRupees = (paise) => (paise == null ? '' : String(paise / 100))

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
export const formatINR = (paise) => (paise == null ? '—' : inr.format(paise / 100))

/** Mirrors the server's rule (models/Product.js) so the admin sees the price before saving. */
export function previewSellingPrice(mrpPaise, discount) {
  if (!mrpPaise) return null
  let price = mrpPaise
  if (discount?.type === 'percent') price = mrpPaise * (1 - (Number(discount.value) || 0) / 100)
  if (discount?.type === 'flat') price = mrpPaise - (Number(discount.value) || 0)
  return Math.max(100, Math.round(price / 100) * 100)
}
