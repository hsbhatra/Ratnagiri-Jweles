import { Link } from 'react-router-dom'
import FilmClip from '../../components/landing/FilmClip'
import { buttonClass } from '../../components/ui/Button'

export default function HeroScene() {
  return (
    <section className="relative flex h-svh max-h-[860px] min-h-[560px] items-end overflow-hidden bg-brand-forest-950 md:items-center">
      <FilmClip name="scene1" className="absolute inset-0 h-full w-full object-cover" />
      {/* Keeps the header and the copy readable over any frame of the film */}
      <div className="absolute inset-0 bg-gradient-to-t from-brand-forest-950 via-brand-forest-950/50 to-brand-forest-950/60 md:bg-gradient-to-r md:from-brand-forest-950/95 md:via-brand-forest-950/55 md:to-brand-forest-950/10" />
      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-24 sm:px-8 md:pb-0">
        <h1 className="max-w-[12ch] font-display text-[2.75rem] leading-[1.04] text-balance text-ink sm:text-6xl lg:text-7xl">
          Handmade silver, thirty-two stones.
        </h1>
        <p className="mt-5 max-w-[38ch] text-[17px] leading-relaxed text-ink/85">
          Rings, earrings, necklaces and bracelets, each one made by hand.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/collections" className={buttonClass()}>
            Shop the collection
          </Link>
          <a href="#stones" className={buttonClass('outline')}>
            Shop by stone
          </a>
        </div>
      </div>
    </section>
  )
}
