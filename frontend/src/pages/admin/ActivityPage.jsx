import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi } from '../../api/admin'
import { PageHeader, Panel } from '../../components/admin/AdminLayout'
import { FormMessage } from '../../components/ui/Button'
import { readError } from '../../lib/authHelpers'
import { formatWhen } from '../../lib/formatWhen'
import { describeAction } from '../../lib/adminFormat'

/** NFR-S12: recent admin changes — who did what, when. */
export default function ActivityPage() {
  const [entries, setEntries] = useState(null)
  const [error, setError] = useState(null)
  useEffect(() => {
    adminApi.auditLog().then((r) => setEntries(r.entries)).catch((err) => setError(readError(err)))
  }, [])
  return (
    <>
      <PageHeader title="Activity" description="The latest changes made in the admin, newest first." />
      <FormMessage>{error?.message}</FormMessage>
      <Panel>
        {!entries ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted">Nothing yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {entries.map((e) => (
              <li key={e._id} className="flex flex-wrap items-baseline justify-between gap-2 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-ink">
                    {e.entity === 'product' ? (
                      <Link to={`/admin/products/${e.entityId}`} className="underline decoration-gold/60 underline-offset-4">
                        {e.summary}
                      </Link>
                    ) : (
                      e.summary
                    )}
                  </p>
                  <p className="text-muted">{e.entity === 'product' ? describeAction(e) : e.action.replace('category.', 'Collection ')}</p>
                </div>
                <p className="text-[13px] text-muted">
                  {e.actorEmail} · {formatWhen(e.at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  )
}
