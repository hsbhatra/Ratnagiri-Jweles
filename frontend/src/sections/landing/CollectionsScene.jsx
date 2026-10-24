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
    <section ref={sectionRef} className="bg-brand-linen-100 px-6 py-24 md:px-16">
      <h2 className="font-display mb-12 text-center text-3xl text-brand-forest-900 md:text-4xl">
        Collections
      </h2>
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4">
        {items.map((item) => (
          <a
            key={item.label}
            href={item.href}
            data-reveal
            className="group block overflow-hidden rounded-sm"
          >
            <div className="aspect-[4/5] overflow-hidden bg-brand-forest-900/5">
              <img
                src={item.src}
                alt={item.label}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <p className="mt-3 text-center font-display text-lg text-brand-forest-900">
              {item.label}
            </p>
          </a>
        ))}
      </div>
    </section>
  )
}
