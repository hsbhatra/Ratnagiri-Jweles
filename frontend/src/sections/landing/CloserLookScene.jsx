import ScrubbedScene from './ScrubbedScene'

const FRAME_COUNT = 240 // all native frames (24fps, 10s), watermark cropped
const framePath = (n) => `/frames/scene3/f_${String(n).padStart(3, '0')}.webp`

export default function CloserLookScene() {
  return (
    <ScrubbedScene frameCount={FRAME_COUNT} framePath={framePath} poster={framePath(1)} scrollLength="180%">
      <p className="font-display max-w-md text-center text-xl text-brand-linen-100 md:text-2xl">
        Made by hand. Made to be worn.
      </p>
    </ScrubbedScene>
  )
}
