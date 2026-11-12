import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useParams } from 'react-router-dom'
import { catalogApi } from '../api/admin'
import ProductGrid from '../components/ProductGrid'
import SiteHeader from '../components/SiteHeader'
import { buttonClass } from '../components/ui/Button'
import { formatINR } from '../lib/money'
import { titleCase } from '../lib/titleCase'

const stoneLine = (s) =>
  [s.count > 1 && `${s.count} ×`, titleCase(s.gem), s.shape, s.sizeMm && `${s.sizeMm} mm`, s.carat && `${s.carat} ct`].filter(Boolean).join(' ')

/** Label/value rows for whatever the admin filled in; empty fields are left out. */
function details(p) {
  const d = p.dimensions || {}
  const size = [d.lengthMm, d.widthMm, d.heightMm].filter(Boolean).join(' × ')
  return [
    ['Metal', p.metal && titleCase(p.metal)],
    ['Purity', p.purity],
    ['Stones', p.stones?.length ? p.stones.map(stoneLine).join(', ') : null],
    ['Weight', p.weightGrams && `${p.weightGrams} g`],
    ['Size', size && `${size} mm`],
    ['Sizes', p.sizes?.length ? p.sizes.map((s) => (s.stock > 0 || p.madeToOrder ? s.label : `${s.label} (sold out)`)).join(', ') : null],
    ['Made', p.handmade ? 'By hand' : null],
  ].filter(([, value]) => value)
}

function availability(p) {
  if (p.madeToOrder) return p.makingDays ? `Made to order, ready in about ${p.makingDays} days` : 'Made to order'
  return p.inStock ? 'In stock' : 'Sold out'
}

/**
 * Product page: photos, price, details, variants and related pieces.
 * shortcut: no "add to bag" because there is no cart yet (Module 4); add the button with it.
 */
export default function ProductPage() {
  const { slug } = useParams()
  const [result, setResult] = useState({ slug: null })
  const [shown, setShown] = useState({ slug: null, index: 0 })

  useEffect(() => {
    let cancelled = false
    catalogApi
      .product(slug)
      .then((data) => !cancelled && setResult({ slug, ...data }))
      .catch((err) => !cancelled && setResult({ slug, missing: err?.error?.code === 'NOT_FOUND', failed: true }))
    return () => {
      cancelled = true
    }
  }, [slug])

  if (result.slug !== slug || result.failed) {
    const loading = result.slug !== slug
    return (
      <>
        <Helmet>
          <title>RatnaGiri Jewels</title>
          {!loading && <meta name="robots" content="noindex" />}
        </Helmet>
        <SiteHeader />
        <main className="mx-auto min-h-[70dvh] max-w-6xl px-5 py-20 sm:px-8">
          {loading ? (
            <p className="text-muted" role="status">
              Loading…
            </p>
          ) : (
            <>
              <h1 className="max-w-[16ch] font-display text-5xl text-balance text-ink">
                {result.missing ? 'This piece is not available.' : "We couldn't load this piece."}
              </h1>
              <p className="mt-4 max-w-[44ch] text-muted">
                {result.missing ? 'It may have sold or been taken down.' : 'Check your connection and try again.'}
              </p>
              <Link to="/collections" className={buttonClass('primary', 'mt-8')}>
                See all pieces
              </Link>
            </>
          )}
        </main>
      </>
    )
  }

  const { product: p, variants, related } = result
  const media = p.media || []
  const current = media[shown.slug === slug ? shown.index : 0]
  const rows = details(p)

  return (
    <>
      <Helmet>
        <title>{`${p.name} | RatnaGiri Jewels`}</title>
        {p.description && <meta name="description" content={p.description.slice(0, 155)} />}
      </Helmet>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 pb-24 pt-10 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] md:gap-14">
          <div className="min-w-0">
            <div className="aspect-[4/5] overflow-hidden border border-line bg-raised">
              {current?.type === 'video' ? (
                <video key={current.url} src={current.url} controls playsInline className="h-full w-full object-cover" />
              ) : (
                current && <img src={current.url} alt={current.alt || p.name} className="h-full w-full object-cover" />
              )}
            </div>
            {media.length > 1 && (
              <ul className="mt-3 flex flex-wrap gap-3">
                {media.map((m, i) => (
                  <li key={m.url}>
                    <button
                      type="button"
                      onClick={() => setShown({ slug, index: i })}
                      aria-label={m.type === 'video' ? `Play video ${i + 1}` : `Show photo ${i + 1}`}
                      aria-pressed={m === current}
                      className={`flex size-16 items-center justify-center overflow-hidden border text-xs text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
                        m === current ? 'border-gold' : 'border-line hover:border-ink'
                      }`}
                    >
                      {m.type === 'video' ? 'Video' : <img src={m.url} alt="" loading="lazy" className="h-full w-full object-cover" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="min-w-0">
            {p.category?.slug && (
              <Link
                to={`/collections/${p.category.slug}`}
                className="text-sm text-gold underline decoration-gold/60 underline-offset-4 hover:text-ink focus-visible:outline-2 focus-visible:outline-gold"
              >
                {p.category.name}
              </Link>
            )}
            <h1 className="mt-3 font-display text-4xl leading-[1.08] text-balance text-ink md:text-5xl">{p.name}</h1>
            <p className="mt-5 text-2xl tabular-nums text-ink">
              {formatINR(p.sellingPrice)}
              {p.sellingPrice < p.mrp && <s className="ml-3 text-lg text-muted">{formatINR(p.mrp)}</s>}
            </p>
            <p className={`mt-2 text-[15px] ${p.inStock ? 'text-muted' : 'text-danger'}`}>{availability(p)}</p>

            {variants.length > 1 && (
              <div className="mt-8">
                <h2 className="text-sm font-medium text-ink">Also made in</h2>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {variants.map((v) => (
                    <li key={v.id}>
                      <Link
                        to={`/products/${v.slug}`}
                        aria-current={v.current ? 'page' : undefined}
                        className={`flex h-11 items-center border px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
                          v.current ? 'border-gold text-gold' : 'border-line text-ink hover:border-ink'
                        }`}
                      >
                        {v.variantLabel || v.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {p.description && <p className="mt-8 max-w-[60ch] whitespace-pre-line text-[16px] leading-relaxed text-ink/90">{p.description}</p>}

            {rows.length > 0 && (
              <dl className="mt-8 divide-y divide-line border-y border-line text-[15px]">
                {rows.map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] gap-4 py-3">
                    <dt className="text-muted">{label}</dt>
                    <dd className="text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {p.careNotes && (
              <>
                <h2 className="mt-8 font-display text-2xl text-ink">Care</h2>
                <p className="mt-2 max-w-[60ch] whitespace-pre-line text-[15px] leading-relaxed text-muted">{p.careNotes}</p>
              </>
            )}
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-24">
            <h2 className="font-display text-3xl text-ink md:text-4xl">More from {p.category?.name || 'the collection'}</h2>
            <ProductGrid products={related} className="mt-8" />
          </section>
        )}
      </main>
    </>
  )
}
