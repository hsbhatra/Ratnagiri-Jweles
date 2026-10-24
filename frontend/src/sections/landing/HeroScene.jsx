import ScrubbedScene from './ScrubbedScene'

// "Light finds it": 10s clip, all 240 native frames (24fps) — no duplicated frames
const FRAME_COUNT = 240
const framePath = (n) => `/frames/scene1/f_${String(n).padStart(3, '0')}.webp`

export default function HeroScene() {
  return (
    <ScrubbedScene frameCount={FRAME_COUNT} framePath={framePath} poster={framePath(1)} scrollLength="180%">
      <h1 className="font-display text-4xl tracking-wide text-brand-linen-100 md:text-6xl">
        RatnaGiri Jewels
      </h1>
      <p className="mt-2 text-sm tracking-[0.3em] text-brand-gold-300 uppercase">
        Handcrafted · Worn · Remembered
      </p>
    </ScrubbedScene>
  )
}
