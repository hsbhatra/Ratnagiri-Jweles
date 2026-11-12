import FilmClip from '../../components/landing/FilmClip'

export default function CloserLookScene() {
  return (
    <section className="relative flex aspect-[4/5] max-h-[820px] w-full items-end overflow-hidden bg-brand-forest-950 md:aspect-video">
      <FilmClip name="scene3" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-brand-forest-950/85 via-transparent to-transparent" />
      <p className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-20 font-display text-3xl text-ink sm:px-8 md:text-5xl">
        Made by hand. Made to be worn.
      </p>
    </section>
  )
}
