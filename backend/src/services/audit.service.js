import AuditLog from '../models/AuditLog.js'

/** Fields → { from, to } for the ones that actually changed (shallow, JSON-compared). */
export function diff(before, after, fields) {
  const changes = {}
  for (const f of fields) {
    const a = JSON.stringify(before?.[f] ?? null)
    const b = JSON.stringify(after?.[f] ?? null)
    if (a !== b) changes[f] = { from: before?.[f] ?? null, to: after?.[f] ?? null }
  }
  return changes
}

/** Never let an audit-log hiccup break the admin action itself. */
export async function audit({ actor, action, entity, entityId, summary, changes }) {
  try {
    await AuditLog.create({ actor: actor._id, actorEmail: actor.email, action, entity, entityId, summary, changes })
  } catch (err) {
    console.error('[audit] failed to record', action, err.message)
  }
}

export function listAudit({ entity, entityId, limit = 50 }) {
  const filter = {}
  if (entity) filter.entity = entity
  if (entityId) filter.entityId = entityId
  return AuditLog.find(filter).sort({ at: -1 }).limit(Math.min(limit, 200)).lean()
}
