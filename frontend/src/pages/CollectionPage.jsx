import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useParams, useSearchParams } from 'react-router-dom'
import { catalogApi } from '../api/admin'
import ProductGrid from '../components/ProductGrid'
import SiteHeader from '../components/SiteHeader'
import { titleCase } from '../lib/titleCase'

/**
 * Collection grid: everything, one collection (/collections/rings) or one stone (?stone=citrine).
 * shortcut: no filters or paging (first 48 pieces); upgrade when the catalogue outgrows one page.
 */
export default function CollectionPage() {
  const { slug } = useParams()
  const [params] = useSearchParams()
  const stone = params.get('stone') || undefined
  const key = `${slug || ''}|${stone || ''}`
  const [result, setResult] = useState({ key: null })

  useEffect(() => {
    let cancelled = false
    catalogApi
      .products({ category: slug, stone, limit: 48 })
      .then((res) => !cancelled && setResult({ key, products: res.products, category: res.category }))
      .catch(() => !cancelled && setResult({ key, products: [], failed: true }))
    return () => {
      cancelled = true
    }
  }, [key, slug, stone])

  const loading = result.key !== key
  const title = stone ? titleCase(stone) : result.category?.name || (slug ? titleCase(slug) : 'All pieces')

  return (
    <>
      <Helmet>
        <title>{`${title} | RatnaGiri Jewels`}</title>
      </Helmet>
      <SiteHeader />
      <main className="mx-auto min-h-[70dvh] max-w-6xl px-5 pb-24 pt-14 sm:px-8">
        <h1 className="font-display text-5xl text-ink md:text-6xl">{title}</h1>
        {loading ? (
          <p className="mt-10 text-muted" role="status">
            Loading…
          </p>
        ) : result.products.length === 0 ? (
          <p className="mt-10 max-w-[44ch] text-muted" role={result.failed ? 'alert' : undefined}>
            {result.failed
              ? "We couldn't load these pieces. Check your connection and try again."
              : 'Pieces are being added here. Please check back soon.'}
          </p>
        ) : (
          <ProductGrid products={result.products} className="mt-10" />
        )}
      </main>
    </>
  )
}
