import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { catalogApi } from '../../api/admin'

// One swatch per colour family in the gem list (backend/src/constants/gems.js)
const SWATCH = {
  purple: '#8e5bb5',
  blue: '#2f7fa8',
  green: '#1f8a5b',
  yellow: '#e0a43a',
  pink: '#f0b7b0',
  red: '#b3123b',
  brown: '#8a6a4a',
  black: '#16181a',
  clear: '#e6ecef',
  white: '#dfe3ea',
  multi: 'conic-gradient(#e0a43a, #b3123b, #8e5bb5, #2f7fa8, #1f8a5b, #e0a43a)',
  'colour-change': 'linear-gradient(135deg, #1f8a5b 50%, #8e5bb5 50%)',
}

/** Shop by stone: the owner's own gem list, straight from the catalogue. Empty if it can't load. */
export default function StonesScene() {
  const [stones, setStones] = useState([])
  useEffect(() => {
    catalogApi
      .meta()
      .then((m) => setStones(m.allStones || []))
      .catch(() => {})
  }, [])
  // The anchor stays so "Shop by stone" links never point at nothing
  if (!stones.length) return <div id="stones" />

  return (
    <section id="stones" className="scroll-mt-4 border-y border-gold/40 bg-field">
      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-12 sm:px-8 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] md:items-start">
        <h2 className="font-display text-3xl text-ink md:text-4xl">Shop by stone</h2>
        <ul className="flex flex-wrap gap-2">
          {stones.map((s) => (
            <li key={s.slug}>
              <Link
                to={`/collections?stone=${s.slug}`}
                className="flex h-11 items-center gap-2.5 border border-line pl-3 pr-4 text-sm text-ink transition-colors hover:border-gold hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                <span className="size-3.5 rounded-full ring-1 ring-ink/25" style={{ background: SWATCH[s.colour] }} aria-hidden="true" />
                {s.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
