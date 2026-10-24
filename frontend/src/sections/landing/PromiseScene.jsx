import useReducedMotion from '../../lib/useReducedMotion'
import useRevealOnScroll from '../../lib/useRevealOnScroll'
import promiseImg from '../../assets/media/img/scene-5-the-promise.webp'

// TODO: Himanshu to confirm/replace final promise copy — placeholders only,
// honest claims no fabricated testimonials, per brand decision.
const promises = [
  { title: 'Real materials', body: 'Solid gold and genuine stones, never plated or simulated.' },
  { title: 'Made by hand', body: 'Each piece is crafted individually, not mass-produced.' },
  { title: 'Built to last', body: "Care guidance included with every order so it stays yours for years." },
]

export default function PromiseScene() {
  const reducedMotion = useReducedMotion()
  const sectionRef = useRevealOnScroll({ reducedMotion })

  return (
    <section
      ref={sectionRef}
      className="grid grid-cols-1 items-center gap-10 bg-brand-forest-950 px-6 py-24 md:grid-cols-2 md:px-16"
    >
      <img
        data-reveal
        src={promiseImg}
        alt=""
        className="aspect-[4/5] w-full rounded-sm object-cover"
      />
      <div data-reveal className="max-w-md">
        <h2 className="font-display mb-8 text-3xl text-brand-linen-100 md:text-4xl">
          Our Promise
        </h2>
        <ul className="space-y-6">
          {promises.map((p) => (
            <li key={p.title}>
              <p className="font-display text-lg text-brand-gold-300">{p.title}</p>
              <p className="mt-1 text-brand-linen-200">{p.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
