import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { adminApi } from '../../api/admin'
import { PageHeader, StatusBadge } from '../../components/admin/AdminLayout'
import { FormMessage } from '../../components/ui/Button'
import { inputClass } from '../../components/ui/Field'
import { readError } from '../../lib/authHelpers'
import { formatINR } from '../../lib/money'

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'active', label: 'Live' },
  { key: 'draft', label: 'Drafts' },
  { key: 'archived', label: 'Archived' },
  { key: 'low', label: 'Low stock' },
]

export default function ProductsPage() {
  const [params, setParams] = useSearchParams()
  const filter = params.get('filter') || ''
  const page = Number(params.get('page') || 1)
  const [q, setQ] = useState(params.get('q') || '')
  const [state, setState] = useState({ products: null, meta: null, error: null })

  useEffect(() => {
    let cancelled = false
    const query = { page, limit: 24, q: params.get('q') || undefined }
    if (filter === 'low') query.lowStock = true
    else if (filter) query.status = filter
    adminApi
      .products(query)
      .then((res) => !cancelled && setState({ products: res.products, meta: res.meta, error: null }))
      .catch((err) => !cancelled && setState({ products: [], meta: null, error: readError(err) }))
    return () => {
      cancelled = true
    }
  }, [filter, page, params])

  const set = (changes) => {
    const next = new URLSearchParams(params)
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
    if (!('page' in changes)) next.delete('page')
    setParams(next)
  }

  const { products, meta, error } = state
  return (
    <>
      <PageHeader
        title="Products"
        description="Everything in the catalogue. Drafts are only visible here; archived pieces stay for order history."
        actions={
          <Link to="/admin/products/new" className="inline-flex h-12 items-center rounded-none bg-action px-7 text-[15px] font-medium text-on-action hover:bg-action/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold">
            Add product
          </Link>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
            set({ q: q.trim() })
          }}
          className="min-w-[220px] flex-1"
        >
          <label htmlFor="admin-search" className="sr-only">
            Search products
          </label>
          <input id="admin-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, SKU or tag" className={inputClass} />
        </form>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={filter === f.key}
              onClick={() => set({ filter: f.key })}
              className={`h-10 rounded-none px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-gold ${
                filter === f.key ? 'bg-action text-on-action' : 'border border-line text-ink hover:border-ink'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <FormMessage>{error?.message}</FormMessage>

      {!products ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : products.length === 0 ? (
        <div className="rounded-none border border-dashed border-line px-6 py-16 text-center">
          <p className="font-display text-2xl text-ink">No products here yet</p>
          <p className="mt-2 text-sm text-muted">
            {params.get('q') || filter ? 'Try a different search or filter.' : 'Add your first piece to start the catalogue.'}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-none border border-line bg-raised">
          {products.map((p) => {
            const cover = p.media?.find((m) => m.type === 'image')
            return (
              <li key={p.id}>
                <Link to={`/admin/products/${p.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-ink/5 focus-visible:bg-ink/5 focus-visible:outline-none sm:px-5">
                  <div className="size-14 shrink-0 overflow-hidden rounded-none bg-ink/10">
                    {cover && <img src={cover.url} alt="" className="h-full w-full object-cover" loading="lazy" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{p.name}</p>
                    <p className="truncate text-[13px] text-muted">
                      {p.sku} · {p.category?.name || '—'}
                    </p>
                  </div>
                  <div className="hidden w-28 text-right text-sm sm:block">
                    <p className="font-medium text-ink">{formatINR(p.sellingPrice)}</p>
                    {p.sellingPrice < p.mrp && <p className="text-[13px] text-muted line-through">{formatINR(p.mrp)}</p>}
                  </div>
                  <div className="w-24 text-right text-sm">
                    {p.madeToOrder ? (
                      <span className="text-muted">Made to order</span>
                    ) : (
                      <span className={p.lowStock ? 'font-medium text-danger' : 'text-muted'}>
                        {p.stock} in stock
                      </span>
                    )}
                  </div>
                  <div className="w-20 text-right">
                    <StatusBadge status={p.status} />
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      {meta?.pages > 1 && (
        <nav aria-label="Pages" className="mt-6 flex items-center justify-center gap-3 text-sm">
          <button type="button" disabled={page <= 1} onClick={() => set({ page: String(page - 1) })} className="rounded-none border border-line px-4 py-2 disabled:opacity-40">
            Previous
          </button>
          <span>
            Page {meta.page} of {meta.pages}
          </span>
          <button type="button" disabled={page >= meta.pages} onClick={() => set({ page: String(page + 1) })} className="rounded-none border border-line px-4 py-2 disabled:opacity-40">
            Next
          </button>
        </nav>
      )}
    </>
  )
}
