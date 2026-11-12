import { useEffect, useRef, useState } from 'react'
import useReducedMotion from '../../lib/useReducedMotion'

const LABEL = { playing: 'Pause film', paused: 'Play film', ended: 'Replay film' }

/**
 * A short silent clip that plays once, in place, while it is on screen. The visitor's
 * scrolling is never taken over. Has a pause button (WCAG 2.2.2); reduced-motion users
 * get the finished frame as a still.
 */
export default function FilmClip({ name, className = '' }) {
  const reducedMotion = useReducedMotion()
  const ref = useRef(null)
  const [state, setState] = useState('playing') // playing | paused | ended

  useEffect(() => {
    const video = ref.current
    if (!video) return undefined
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && state === 'playing') video.play().catch(() => setState('paused'))
        else video.pause()
      },
      { threshold: 0.4 }
    )
    obs.observe(video)
    return () => obs.disconnect()
  }, [state, reducedMotion])

  if (reducedMotion) return <img src={`/media/intro/${name}-last.webp`} alt="" className={className} />

  const toggle = () => {
    if (state === 'ended') ref.current.currentTime = 0
    setState(state === 'playing' ? 'paused' : 'playing')
  }
  return (
    <>
      <video
        ref={ref}
        className={className}
        muted
        playsInline
        preload="metadata"
        poster={`/media/intro/${name}-first.webp`}
        onEnded={() => setState('ended')}
        aria-hidden="true"
      >
        <source src={`/media/intro/${name}.webm`} type="video/webm" />
        <source src={`/media/intro/${name}.mp4`} type="video/mp4" />
      </video>
      <button
        type="button"
        onClick={toggle}
        className="absolute bottom-5 right-5 z-20 h-11 border border-brand-linen-100/50 bg-brand-forest-950/60 px-4 text-sm text-brand-linen-100 hover:border-brand-linen-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold-300"
      >
        {LABEL[state]}
      </button>
    </>
  )
}
