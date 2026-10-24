import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * Scroll-triggered reveal for static sections (4-6). Uses GSAP matchMedia so
 * desktop and mobile get genuinely different motion, not just scaled copies
 * — per the project's animation philosophy. Reduced-motion users get an
 * instant, un-animated reveal.
 */
export default function useRevealOnScroll({ reducedMotion } = {}) {
  const sectionRef = useRef(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const targets = section.querySelectorAll('[data-reveal]')

    if (reducedMotion) {
      targets.forEach((el) => el.removeAttribute('style'))
      return
    }

    const mm = gsap.matchMedia()

    mm.add(
      {
        isDesktop: '(min-width: 768px)',
        isMobile: '(max-width: 767px)',
      },
      (context) => {
        const { isDesktop } = context.conditions

        targets.forEach((el, i) => {
          gsap.fromTo(
            el,
            {
              opacity: 0,
              y: isDesktop ? 0 : 24,
              x: isDesktop ? (i % 2 === 0 ? -40 : 40) : 0, // asymmetric parallax drift on desktop
            },
            {
              opacity: 1,
              y: 0,
              x: 0,
              duration: isDesktop ? 1 : 0.6,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: el,
                start: 'top 85%',
                toggleActions: 'play none none reverse',
              },
            }
          )
        })

        return () => {}
      },
      section
    )

    return () => mm.revert()
  }, [reducedMotion])

  return sectionRef
}
