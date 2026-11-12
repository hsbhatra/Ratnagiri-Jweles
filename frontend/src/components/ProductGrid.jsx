import { Link } from 'react-router-dom'
import { formatINR } from '../lib/money'

/** Grid of product cards (the API's card shape); each opens its product page. */
export default function ProductGrid({ products, className = '' }) {
  return (
    <ul className={`grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6 ${className}`}>
      {products.map((p) => (
        <li key={p.id} className="min-w-0">
          <Link to={`/products/${p.slug}`} className="group block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold">
            <div className="aspect-[4/5] overflow-hidden border border-line bg-raised transition-colors group-hover:border-gold">
              {p.cover && <img src={p.cover.url} alt={p.cover.alt} loading="lazy" className="h-full w-full object-cover" />}
            </div>
            <p className="mt-3 text-[15px] font-medium text-ink group-hover:text-gold">{p.name}</p>
            <p className="mt-0.5 text-sm tabular-nums text-muted">
              {formatINR(p.sellingPrice)}
              {p.onSale && <s className="ml-2 opacity-70">{formatINR(p.mrp)}</s>}
              {!p.inStock && <span className="ml-2 text-danger">Sold out</span>}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  )
}
