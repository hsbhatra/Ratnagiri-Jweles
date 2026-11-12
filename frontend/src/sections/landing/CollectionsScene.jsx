import { Link } from 'react-router-dom'
import useReducedMotion from '../../lib/useReducedMotion'
import useRevealOnScroll from '../../lib/useRevealOnScroll'
import rings from '../../assets/media/img/collection-1-rings.webp'
import earrings from '../../assets/media/img/collection-2-earrings.webp'
import bracelet from '../../assets/media/img/collection-3-bracelet-stack.webp'
import necklace from '../../assets/media/img/collection-4-necklace-layered.webp'

const items = [
  { src: rings, label: 'Rings', href: '/collections/rings' },
  { src: earrings, label: 'Earrings', href: '/collections/earrings' },
  { src: bracelet, label: 'Bracelets', href: '/collections/bracelets' },
  { src: necklace, label: 'Necklaces', href: '/collections/necklaces' },
]

export default function CollectionsScene() {
  const reducedMotion = useReducedMotion()
  const sectionRef = useRevealOnScroll({ reducedMotion })

  return (
    <section ref={sectionRef} id="collections" className="scroll-mt-4 px-5 py-24 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-10 font-display text-4xl text-ink md:text-5xl">Collections</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {items.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              data-reveal
              className="group block min-w-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
            >
              <div className="aspect-[4/5] overflow-hidden border border-line transition-colors group-hover:border-gold">
                <img
                  src={item.src}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="mt-3 font-display text-xl text-ink group-hover:text-gold">{item.label}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
