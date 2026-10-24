import { useCallback, useEffect, useRef, useState } from 'react'
import useReducedMotion from '../../lib/useReducedMotion'

/**
 * "Stone to Setting": three short clips (loose stone → finished silver piece) that play
 * one after another on their own once the chapter is on screen — no scroll-scrubbing.
 * Each stone's caption reveals when its piece is complete; the closing link reveals
 * after the last one. Pauses off-screen, has a pause button (WCAG 2.2.2), and shows
 * the finished pieces as stills for reduced-motion users or if autoplay is blocked.
 */
const STONES = [
  { id: 'yellow', label: 'Yellow stone', piece: 'Ring', link: 'See rings', href: '/collections/rings', dot: '#e0a43a' },
  { id: 'blue', label: 'Blue stone', piece: 'Pendant', link: 'See necklaces', href: '/collections/necklaces', dot: '#4aa3d8' },
  { id: 'green', label: 'Green stone', piece: 'Ring', link: 'See rings', href: '/collections/rings', dot: '#3fa36b' },
]
// Pick the smaller WebM where supported (most browsers), MP4 for Safari/iOS
const EXT =
  typeof document !== 'undefined' && document.createElement('video').canPlayType('video/webm; codecs="vp9"')
    ? 'webm'
    : 'mp4'

export default function StoneToSettingScene() {
  const reducedMotion = useReducedMotion()
  const sectionRef = useRef(null)
  const videoRefs = useRef([])
  const [near, setNear] = useState(false) // start downloading only when the chapter is close
  const [inView, setInView] = useState(false)
  const [active, setActive] = useState(0)
  const [done, setDone] = useState([false, false, false])
  const [paused, setPaused] = useState(false)
  const [autoplayBlocked, setAutoplayBlocked] = useState(false)
  const [progress, setProgress] = useState(0)

  const stillMode = reducedMotion || autoplayBlocked
  const allDone = done.every(Boolean)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return undefined
    const nearObs = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: '600px 0px' })
    const viewObs = new IntersectionObserver(([e]) => setInView(e.intersectionRatio >= 0.45), { threshold: [0, 0.45, 1] })
    nearObs.observe(el)
    viewObs.observe(el)
    return () => {
      nearObs.disconnect()
      viewObs.disconnect()
    }
  }, [])

  // Play the active clip while the chapter is on screen; pause everything otherwise.
  useEffect(() => {
    if (stillMode || !near) return
    videoRefs.current.forEach((v, i) => {
      if (!v) return
      if (i === active && inView && !paused) {
        v.play().catch(() => setAutoplayBlocked(true))
      } else {
        v.pause()
      }
    })
  }, [active, inView, paused, near, stillMode])

  const onEnded = useCallback(
    (i) => {
      setDone((d) => d.map((x, j) => (j === i ? true : x)))
      if (i < STONES.length - 1) {
        // Brief hold on the finished piece before the next stone appears
        setTimeout(() => {
          setProgress(0)
          setActive((a) => (a === i ? i + 1 : a))
          const next = videoRefs.current[i + 1]
          if (next) next.currentTime = 0
        }, 900)
      }
    },
    []
  )

  function choose(i) {
    setProgress(0)
    setActive(i)
    setPaused(false)
    const v = videoRefs.current[i]
    if (v && !stillMode) v.currentTime = 0
  }

  const stone = STONES[active]
  const captionShown = stillMode || done[active]

  return (
    <section
      ref={sectionRef}
      aria-label="From stone to setting"
      className="relative flex min-h-[640px] w-full flex-col overflow-hidden bg-brand-forest-950 text-brand-linen-100 md:block md:h-screen"
    >
      {/* Media: full-bleed on desktop, top band on phones */}
      <div className="relative h-[56vh] min-h-[320px] w-full md:absolute md:inset-0 md:h-full">
        {STONES.map((s, i) => (
          <div
            key={s.id}
            className={`absolute inset-0 transition-opacity duration-700 ${i === active ? 'opacity-100' : 'opacity-0'}`}
            aria-hidden="true"
          >
            {stillMode ? (
              <img src={`/media/stones/${s.id}-last.webp`} alt="" className="h-full w-full object-cover" />
            ) : (
              <video
                ref={(el) => (videoRefs.current[i] = el)}
                className="h-full w-full object-cover"
                muted
                playsInline
                preload={near ? 'auto' : 'none'}
                src={near ? `/media/stones/${s.id}.${EXT}` : undefined}
                poster={`/media/stones/${s.id}-first.webp`}
                onEnded={() => onEnded(i)}
                onTimeUpdate={(e) => i === active && setProgress(e.currentTarget.currentTime / (e.currentTarget.duration || 1))}
              />
            )}
          </div>
        ))}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-brand-forest-950 md:bg-gradient-to-r md:from-brand-forest-950/90 md:via-brand-forest-950/40 md:to-transparent" />
      </div>

      {/* Copy */}
      <div className="relative z-10 flex flex-col gap-4 px-6 pb-10 pt-2 md:absolute md:left-16 md:top-1/2 md:w-[440px] md:-translate-y-1/2 md:p-0 lg:left-24">
        <p className="text-sm text-brand-gold-300">Before it's jewellery, it's a stone</p>
        <h2 className="font-display text-4xl leading-[1.05] md:text-6xl">Every piece begins with a single stone.</h2>

        <div
          className={`flex flex-col gap-1 transition-all duration-700 ${captionShown ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}
          aria-live="polite"
        >
          <p className="font-display text-2xl">
            {stone.label}, set as a {stone.piece.toLowerCase()}.
          </p>
          <a
            href={stone.href}
            tabIndex={captionShown ? 0 : -1}
            className="w-fit text-sm font-medium text-brand-gold-300 underline decoration-brand-gold-500/60 underline-offset-4 hover:text-brand-linen-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold-400"
          >
            {stone.link}
          </a>
        </div>
      </div>

      {/* Stone picker — doubles as the chapter's progress */}
      <div className="relative z-10 flex items-center gap-2 px-6 pb-8 md:absolute md:right-16 md:top-1/2 md:-translate-y-1/2 md:flex-col md:items-end md:gap-3 md:p-0 lg:right-24">
        {STONES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => choose(i)}
            aria-pressed={i === active}
            className={`flex h-11 items-center gap-3 rounded-full px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-brand-gold-400 md:flex-row-reverse ${
              i === active ? 'text-brand-linen-100' : 'text-brand-linen-100/60 hover:text-brand-linen-100'
            }`}
          >
            <span
              className="size-3 rounded-full"
              style={i === active || done[i] ? { background: s.dot, boxShadow: i === active ? `0 0 0 4px ${s.dot}40` : 'none' } : { border: '1.5px solid currentColor' }}
            />
            <span className="hidden sm:inline">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Progress + pause */}
      {!stillMode && (
        <div className="relative z-10 flex items-center gap-4 px-6 pb-8 md:absolute md:bottom-12 md:left-16 md:right-16 md:p-0 lg:left-24 lg:right-24">
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="flex size-11 shrink-0 items-center justify-center rounded-full border border-brand-linen-100/40 hover:border-brand-linen-100 focus-visible:outline-2 focus-visible:outline-brand-gold-400"
            aria-label={paused ? 'Play the stones' : 'Pause the stones'}
          >
            {paused ? (
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1.5v11l9-5.5z" fill="currentColor" /></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1.5h3v11H3zM8 1.5h3v11H8z" fill="currentColor" /></svg>
            )}
          </button>
          <div className="flex flex-1 gap-2" aria-hidden="true">
            {STONES.map((s, i) => (
              <span key={s.id} className="relative h-0.5 flex-1 overflow-hidden bg-brand-linen-100/20">
                <span
                  className="absolute inset-y-0 left-0 bg-brand-gold-500"
                  style={{ width: `${done[i] && i !== active ? 100 : i === active ? Math.round(progress * 100) : 0}%` }}
                />
              </span>
            ))}
          </div>
          {allDone && (
            <a
              href="/collections"
              className="hidden shrink-0 rounded-full bg-brand-linen-100 px-6 py-3 text-sm font-medium text-brand-forest-950 transition-colors hover:bg-brand-gold-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold-400 md:inline-block"
            >
              Explore the collection
            </a>
          )}
        </div>
      )}
    </section>
  )
}
