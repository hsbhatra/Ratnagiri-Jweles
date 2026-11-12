import useReducedMotion from '../../lib/useReducedMotion'
import useRevealOnScroll from '../../lib/useRevealOnScroll'
import promiseImg from '../../assets/media/img/scene-5-the-promise.webp'

// TODO: owner to confirm the final promise copy. Only facts we already hold are stated here
// (silver, the 32-stone list, handmade); nothing about purity or stone origin is claimed.
const promises = [
  { title: 'Silver and stone', body: 'Handcrafted, mainly in silver, with thirty-two kinds of stone to choose from.' },
  { title: 'Made by hand', body: 'Each piece is crafted individually, not mass-produced.' },
  { title: 'Built to last', body: 'Care guidance included with every order so it stays yours for years.' },
]

export default function PromiseScene() {
  const reducedMotion = useReducedMotion()
  const sectionRef = useRevealOnScroll({ reducedMotion })

  return (
    <section ref={sectionRef} id="promise" className="scroll-mt-4 border-y border-gold/40 bg-raised px-5 py-24 sm:px-8">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-16">
        <img data-reveal src={promiseImg} alt="" loading="lazy" className="aspect-[4/5] w-full border border-line object-cover" />
        <div data-reveal>
          <h2 className="mb-10 font-display text-4xl text-ink md:text-5xl">Our promise</h2>
          <dl className="divide-y divide-line border-y border-line">
            {promises.map((p) => (
              <div key={p.title} className="grid gap-1 py-5 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)] sm:gap-6">
                <dt className="font-display text-xl text-gold">{p.title}</dt>
                <dd className="max-w-[44ch] text-muted">{p.body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  )
}
