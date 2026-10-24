import useReducedMotion from '../../lib/useReducedMotion'
import useFrameScrubScene from '../../lib/useFrameScrubScene'

/**
 * Shared shell for the storyboard scenes (1-3): a preloaded canvas frame sequence
 * that plays itself through at the clip's natural speed once the user scrolls into
 * the scene (forwards or backwards), with a Skip control while it plays.
 */
export default function ScrubbedScene({ frameCount, framePath, poster, scrollLength, children, className = '' }) {
  const reducedMotion = useReducedMotion()
  const { sectionRef, canvasRef, ready, playing, skip } = useFrameScrubScene({ frameCount, framePath, reducedMotion, scrollLength })

  return (
    <section
      ref={sectionRef}
      className={`relative h-screen w-full overflow-hidden bg-brand-forest-950 ${className}`}
    >
      {!ready && poster && (
        <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0 bg-gradient-to-t from-brand-forest-950/40 via-transparent to-transparent" />
      <div className="relative z-10 flex h-full flex-col items-center justify-end pb-16 text-brand-linen-100">
        {children}
      </div>
      {playing && (
        <button
          type="button"
          onClick={skip}
          className="absolute bottom-6 right-6 z-20 rounded-full bg-brand-forest-950/60 px-5 py-2.5 text-sm font-medium text-brand-linen-100 backdrop-blur-sm transition-colors hover:bg-brand-forest-950/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold-400"
        >
          Skip
        </button>
      )}
    </section>
  )
}
