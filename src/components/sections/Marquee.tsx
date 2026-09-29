import { useLayoutEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useI18n } from '@/context/I18nContext'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { getLenis } from '@/lib/motionEngine'

export function Marquee() {
  const { content } = useI18n()
  const reduced = usePrefersReducedMotion()
  const trackRef = useRef<HTMLDivElement>(null)
  const items = [...content.marquee, ...content.marquee]

  useLayoutEffect(() => {
    const track = trackRef.current
    if (!track || reduced) return

    const skew = gsap.quickTo(track, 'skewX', { duration: 0.35, ease: 'power3.out' })
    const update = () => {
      const velocity = getLenis()?.velocity ?? ScrollTrigger.getAll()[0]?.getVelocity?.() ?? 0
      const next = gsap.utils.clamp(-14, 14, velocity / 28)
      skew(next)
    }

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: track,
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: update,
      })
    }, track)

    return () => ctx.revert()
  }, [reduced, content.marquee])

  return (
    <div className="marquee" aria-hidden="true">
      <div ref={trackRef} className={`marquee-track ${reduced ? 'is-static' : ''}`}>
        {items.map((item, index) => (
          <span key={`${item}-${index}`} className="marquee-item">
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}
