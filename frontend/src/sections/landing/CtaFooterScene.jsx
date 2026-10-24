import useReducedMotion from '../../lib/useReducedMotion'
import useRevealOnScroll from '../../lib/useRevealOnScroll'
import ctaImg from '../../assets/media/img/scene-6-cta-footer.webp'

export default function CtaFooterScene() {
  const reducedMotion = useReducedMotion()
  const sectionRef = useRevealOnScroll({ reducedMotion })

  return (
    <section ref={sectionRef} className="relative bg-brand-linen-100">
      <div className="relative aspect-[4/5] w-full overflow-hidden md:aspect-[16/9]">
        <img src={ctaImg} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-linen-100 via-transparent to-transparent" />
      </div>
      <div data-reveal className="flex flex-col items-center px-6 py-16 text-center">
        <h2 className="font-display text-3xl text-brand-forest-900 md:text-4xl">
          Find the piece that's already yours.
        </h2>
        <a
          href="/collections"
          className="mt-6 rounded-full bg-brand-forest-900 px-8 py-3 font-display text-brand-linen-100 transition-colors hover:bg-brand-forest-800"
        >
          Shop the Collection
        </a>
      </div>
      <footer className="border-t border-brand-forest-900/10 px-6 py-10 text-center text-sm text-brand-forest-900/70">
        <p>© {new Date().getFullYear()} RatnaGiri Jewels. Handcrafted jewellery.</p>
      </footer>
    </section>
  )
}
