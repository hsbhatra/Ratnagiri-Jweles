import { Link } from 'react-router-dom'
import useReducedMotion from '../../lib/useReducedMotion'
import useRevealOnScroll from '../../lib/useRevealOnScroll'
import { buttonClass } from '../../components/ui/Button'
import ctaImg from '../../assets/media/img/scene-6-cta-footer.webp'

const YEAR = new Date().getFullYear()

export default function CtaFooterScene() {
  const reducedMotion = useReducedMotion()
  const sectionRef = useRevealOnScroll({ reducedMotion })

  return (
    <section ref={sectionRef} className="relative">
      <div className="relative aspect-[4/5] max-h-[720px] w-full overflow-hidden md:aspect-[16/9]">
        <img src={ctaImg} alt="" loading="lazy" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-forest-950 via-brand-forest-950/20 to-transparent" />
      </div>
      <div data-reveal className="mx-auto flex max-w-6xl flex-col items-start px-5 pb-20 pt-6 sm:px-8">
        <h2 className="max-w-[16ch] font-display text-4xl text-balance text-ink md:text-6xl">Find the piece that’s already yours.</h2>
        <Link to="/collections" className={buttonClass('primary', 'mt-8')}>
          Shop the collection
        </Link>
      </div>
      <footer className="border-t border-gold/40 px-5 py-8 text-sm text-muted sm:px-8">
        <p className="mx-auto max-w-6xl">© {YEAR} RatnaGiri Jewels. Handcrafted jewellery.</p>
      </footer>
    </section>
  )
}
