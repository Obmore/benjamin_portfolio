import { useLayoutEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useI18n } from '@/context/I18nContext'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { scrollToSection } from '@/hooks/useActiveSection'

export function StoryRail() {
  const { content } = useI18n()
  const reduced = usePrefersReducedMotion()
  const railRef = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const rail = railRef.current
    if (!rail || reduced) return
    const fill = rail.querySelector<HTMLElement>('[data-rail-fill]')
    const items = rail.querySelectorAll<HTMLElement>('[data-rail-item]')
    const ctx = gsap.context(() => {
      if (fill) {
        gsap.fromTo(
          fill,
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: document.documentElement,
              start: 'top top',
              end: 'bottom bottom',
              scrub: true,
            },
          },
        )
      }
      items.forEach((item) => {
        const id = item.dataset.railItem
        if (!id) return
        const target = document.getElementById(id)
        if (!target) return
        ScrollTrigger.create({
          trigger: target,
          start: 'top 45%',
          end: 'bottom 45%',
          onToggle: (self) => item.classList.toggle('is-active', self.isActive),
        })
      })
    }, rail)
    return () => ctx.revert()
  }, [reduced, content.rail])

  return (
    <nav ref={railRef} className="story-rail" aria-label={content.common.mainNav}>
      <span className="story-rail-track" aria-hidden="true">
        <span className="story-rail-fill" data-rail-fill />
      </span>
      <ol className="story-rail-list">
        {content.rail.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              data-rail-item={item.id}
              className="story-rail-item"
              onClick={() => scrollToSection(item.id)}
            >
              <span className="story-rail-dot" aria-hidden="true" />
              <span className="story-rail-label">{item.label}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  )
}
