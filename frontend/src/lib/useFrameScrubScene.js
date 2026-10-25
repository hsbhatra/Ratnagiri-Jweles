import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'
import {
  acquireAutoplay,
  autoplayBusy,
  cancelPendingChain,
  chainForwardFrom,
  registerScene,
  releaseAutoplay,
} from './scrollAutoplay'

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin)

// The clips were generated at 24fps; playing them at 36 (1.5×) still reads as natural
// motion while keeping the opening film short (240 frames ≈ 6.7s per scene).
const PLAYBACK_FPS = 36
const HANDOFF_SECONDS = 0.9 // gliding the next section into place after the last frame

/**
 * Pins a section and scrubs a pre-extracted frame sequence on <canvas>
 * instead of seeking a compressed video's currentTime. Seeking an h264
 * video on every scroll tick is choppy (the browser decodes to the
 * nearest keyframe each time); blitting a preloaded image is instant, so
 * the scrub tracks scroll at full display refresh rate.
 *
 * Autoplay: as soon as the user scrolls into a scene, the page takes over and plays
 * the whole clip (frameCount / PLAYBACK_FPS s), then glides on until the next section
 * is in place — and if that section is another scene it carries straight on, so the
 * scenes play as one continuous film (see chaining in scrollAutoplay.js). Scrolling up into a scene plays it backwards the same way
 * and stops at the scene's start. The user's own scroll input is held meanwhile
 * (see scrollAutoplay.js); Escape or the Skip button jump to the end of the current
 * scene, and the next scene then starts by itself.
 *
 * framePath(n) -> URL string for 1-indexed frame n (frames live in
 * public/, fetched at runtime rather than bundled as 150 JS imports).
 */
export default function useFrameScrubScene({ frameCount, framePath, reducedMotion, scrollLength = '120%' }) {
  const sectionRef = useRef(null)
  const canvasRef = useRef(null)
  const imagesRef = useRef([])
  const currentFrameRef = useRef(1)
  const skipRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)

  // Preload all frames up front for this scene (only mounted once its
  // section nears the viewport — see the IntersectionObserver wrapper).
  useEffect(() => {
    let cancelled = false
    const images = new Array(frameCount)
    let loadedCount = 0

    for (let i = 1; i <= frameCount; i++) {
      const img = new Image()
      img.src = framePath(i)
      img.onload = () => {
        loadedCount += 1
        if (!cancelled && loadedCount === frameCount) setReady(true)
      }
      images[i - 1] = img
    }
    imagesRef.current = images

    return () => {
      cancelled = true
    }
  }, [frameCount, framePath])

  const drawFrame = (n) => {
    const canvas = canvasRef.current
    const img = imagesRef.current[n - 1]
    if (!canvas || !img || !img.complete || img.naturalWidth === 0) return
    const ctx = canvas.getContext('2d')
    const { width, height } = canvas
    // object-fit: cover math
    const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight)
    const w = img.naturalWidth * scale
    const h = img.naturalHeight * scale
    ctx.clearRect(0, 0, width, height)
    ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h)
  }

  // Resize canvas to its container at device pixel ratio.
  useEffect(() => {
    const canvas = canvasRef.current
    const section = sectionRef.current
    if (!canvas || !section) return

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = section.clientWidth * dpr
      canvas.height = section.clientHeight * dpr
      drawFrame(currentFrameRef.current)
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [ready])

  useEffect(() => {
    if (!ready) return
    const section = sectionRef.current
    if (!section) return

    drawFrame(1)

    if (reducedMotion) {
      // Static fallback: hold on the final frame, no pin/scrub/snap.
      section.style.setProperty('--scene-progress', '1')
      currentFrameRef.current = frameCount
      drawFrame(frameCount)
      return
    }

    const ctx = gsap.context(() => {
      const trigger = ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: `+=${scrollLength}`,
        pin: true,
        scrub: true, // frames follow the (programmatic) scroll exactly
        onUpdate: (self) => {
          // exposed so overlay copy can react to scrub progress in CSS
          section.style.setProperty('--scene-progress', self.progress.toFixed(3))
          const frame = Math.max(1, Math.round(self.progress * (frameCount - 1)) + 1)
          if (frame !== currentFrameRef.current) {
            currentFrameRef.current = frame
            drawFrame(frame)
          }
        },
      })

      const clipSeconds = frameCount / PLAYBACK_FPS
      let lastY = window.scrollY
      let timeline = null

      function playTo(direction) {
        const y = window.scrollY
        const height = section.offsetHeight
        const span = Math.max(1, trigger.end - trigger.start)
        const zoneEnd = trigger.end + height // where the next section sits at the top
        const controller = { skip: () => timeline?.progress(1) }
        if (!acquireAutoplay(controller)) return

        const scrollTo = (target) => ({ y: target, autoKill: false })
        timeline = gsap.timeline({
          onComplete: finish,
          onInterrupt: finish,
        })
        if (direction > 0) {
          if (y < trigger.end) {
            timeline.to(window, { scrollTo: scrollTo(trigger.end), duration: (clipSeconds * (trigger.end - y)) / span, ease: 'none' })
          }
          timeline.to(window, {
            scrollTo: scrollTo(zoneEnd),
            duration: (HANDOFF_SECONDS * (zoneEnd - Math.max(y, trigger.end))) / height,
            ease: 'power2.inOut',
          })
        } else {
          if (y > trigger.end) {
            timeline.to(window, {
              scrollTo: scrollTo(trigger.end),
              duration: (HANDOFF_SECONDS * (y - trigger.end)) / height,
              ease: 'power2.inOut',
            })
          }
          timeline.to(window, {
            scrollTo: scrollTo(trigger.start),
            duration: (clipSeconds * (Math.min(y, trigger.end) - trigger.start)) / span,
            ease: 'none',
          })
        }
        skipRef.current = controller.skip
        setPlaying(true)

        function finish() {
          releaseAutoplay(controller)
          skipRef.current = null
          setPlaying(false)
          lastY = window.scrollY
          // Forward play (finished or skipped) hands over to the next scene, if there is one
          if (direction > 0) chainForwardFrom(lastY)
        }
      }

      // Any user scroll that lands inside this scene's zone starts the autoplay in that direction
      function onScroll() {
        const y = window.scrollY
        const direction = Math.sign(y - lastY)
        lastY = y
        if (!direction || autoplayBusy()) return
        cancelPendingChain(y)
        const zoneEnd = trigger.end + section.offsetHeight
        if (y > trigger.start + 1 && y < zoneEnd - 1) playTo(direction)
      }
      window.addEventListener('scroll', onScroll, { passive: true })
      const unregister = registerScene({ start: () => trigger.start, play: () => playTo(1) })

      return () => {
        unregister()
        window.removeEventListener('scroll', onScroll)
        if (timeline) timeline.progress(1).kill()
        trigger.kill()
      }
    }, section)

    return () => ctx.revert()
  }, [ready, reducedMotion, frameCount, scrollLength])

  const skip = () => skipRef.current?.()
  return { sectionRef, canvasRef, ready, playing, skip }
}
