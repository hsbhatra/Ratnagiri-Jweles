import { formatINR } from './money'

/** One line per audit-log entry, in plain words. */
export function describeAction(e) {
  const c = e.changes || {}
  const price = (f) => (c[f] ? `${formatINR(c[f].from)} → ${formatINR(c[f].to)}` : null)
  switch (e.action) {
    case 'product.create': return 'Created'
    case 'product.price_change': return `Price changed${c.sellingPrice ? `: ${price('sellingPrice')}` : ''}`
    case 'product.stock': return `Stock ${c.stock ? `${c.stock.from} → ${c.stock.to}` : 'updated'}`
    case 'product.archive': return 'Archived'
    case 'product.restore': return 'Restored'
    case 'product.link_variant': return `Linked variants (${e.summary})`
    case 'product.unlink_variant': return 'Removed from variant group'
    case 'product.update': {
      const keys = Object.keys(c)
      if ('status' in c) return c.status.to === 'active' ? 'Published' : 'Moved to draft'
      return keys.length ? `Edited ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '…' : ''}` : 'Saved (no changes)'
    }
    default: return e.action.replace('.', ' ')
  }
}
