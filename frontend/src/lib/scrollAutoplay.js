/**
 * Shared lock for scene autoplay. While one scene is playing itself through, the
 * user's own scroll input (wheel, touch, keyboard) is held so the animation runs
 * uninterrupted at its natural speed; Escape or the scene's Skip button finish it
 * immediately (WCAG 2.2.2: moving content longer than 5s must be stoppable).
 */
import gsap from 'gsap'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'

gsap.registerPlugin(ScrollToPlugin)

const SCROLL_KEYS = new Set([' ', 'Spacebar', 'PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', 'Home', 'End'])

let active = null // { skip: () => void, cancel?: () => void }
let cooldownUntil = 0

function isTypingTarget(el) {
  return el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(el.tagName))
}

function blockInput(e) {
  if (e.type === 'keydown') {
    if (e.key === 'Escape') {
      active?.skip()
      return
    }
    if (!SCROLL_KEYS.has(e.key) || isTypingTarget(e.target)) return
  }
  if (e.cancelable) e.preventDefault()
}

export function acquireAutoplay(controller) {
  if (active) return false
  active = controller
  // CSS `scroll-behavior: smooth` would turn every programmatic scroll step into its own
  // smooth animation, so the tween barely moves; switch it off while autoplaying.
  document.documentElement.style.scrollBehavior = 'auto'
  window.addEventListener('wheel', blockInput, { passive: false })
  window.addEventListener('touchmove', blockInput, { passive: false })
  window.addEventListener('keydown', blockInput)
  return true
}

export function releaseAutoplay(controller) {
  if (active !== controller) return
  active = null
  document.documentElement.style.scrollBehavior = ''
  window.removeEventListener('wheel', blockInput)
  window.removeEventListener('touchmove', blockInput)
  window.removeEventListener('keydown', blockInput)
  // Ignore the trailing scroll events from the finished tween
  cooldownUntil = performance.now() + 250
}

export function autoplayBusy() {
  return Boolean(active) || performance.now() < cooldownUntil
}

// ---------------------------------------------------------------- chaining
// When a scene finishes playing forwards (or is skipped), the page is resting exactly at
// the next section's top. If that section is another autoplay scene, it starts on its own,
// so scenes 1 → 2 → 3 run as one continuous film. A scene whose frames are still loading
// picks the hand-off up as soon as it's ready, provided the visitor hasn't scrolled away.
const scenes = new Set() // { start: () => number, play: () => void }
let pendingChainY = null
const AT = 3 // px tolerance for "resting at a scene's start"

export function registerScene(scene) {
  scenes.add(scene)
  if (pendingChainY !== null && Math.abs(scene.start() - pendingChainY) < AT && Math.abs(window.scrollY - pendingChainY) < AT) {
    pendingChainY = null
    requestAnimationFrame(() => scene.play())
  }
  return () => scenes.delete(scene)
}

export function chainForwardFrom(y) {
  for (const scene of scenes) {
    if (Math.abs(scene.start() - y) < AT) {
      pendingChainY = null
      requestAnimationFrame(() => scene.play())
      return
    }
  }
  pendingChainY = y
}

/** The visitor moved on before a pending hand-off could start — drop it. */
export function cancelPendingChain(y) {
  if (pendingChainY !== null && Math.abs(y - pendingChainY) >= AT) pendingChainY = null
}

// ---------------------------------------------------------------- skip the whole intro
/**
 * Skip leaves the animated intro altogether: the playing scene stops (without handing
 * over to the next one) and the page glides to the first section after the intro, the
 * one marked `data-intro-end` (Collections). Input stays held during the glide so the
 * scenes it passes through don't start playing.
 */
export function skipIntro() {
  active?.cancel?.()
  pendingChainY = null
  const target = document.querySelector('[data-intro-end]')
  if (!target) return
  const glide = { skip() {} }
  if (!acquireAutoplay(glide)) return
  gsap.to(window, {
    scrollTo: { y: target, autoKill: false },
    duration: 1.2,
    ease: 'power2.inOut',
    onComplete: () => releaseAutoplay(glide),
    onInterrupt: () => releaseAutoplay(glide),
  })
}
