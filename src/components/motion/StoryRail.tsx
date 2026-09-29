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
    const items = [...rail.querySelectorAll<HTMLElement>('[data-rail-item]')]
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

      const sync = () => {
        const mid = window.innerHeight / 2
        let activeId = items[0]?.dataset.railItem ?? ''
        let best = Number.POSITIVE_INFINITY
        for (const item of items) {
          const id = item.dataset.railItem
          const target = id ? document.getElementById(id) : null
          if (!id || !target) continue
          const box = sectionRect(target)
          const contains = box.top <= mid && box.bottom > mid
          const dist = contains
            ? 0
            : Math.min(Math.abs(box.top - mid), Math.abs(box.bottom - mid))
          if (dist < best) {
            best = dist
            activeId = id
          }
        }
        for (const item of items) {
          item.classList.toggle('is-active', item.dataset.railItem === activeId)
        }
      }

      ScrollTrigger.create({
        start: 0,
        end: 'max',
        onUpdate: sync,
        onRefresh: sync,
      })
      sync()
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

function sectionRect(el: HTMLElement): DOMRect {
  const inner = el.querySelector('.pin-spacer')
  const parent = el.parentElement?.classList.contains('pin-spacer') ? el.parentElement : null
  const spacer = inner ?? parent
  if (!spacer) return el.getBoundingClientRect()
  const outer = el.getBoundingClientRect()
  const box = spacer.getBoundingClientRect()
  const top = Math.min(outer.top, box.top)
  const bottom = Math.max(outer.bottom, box.bottom)
  return new DOMRect(outer.left, top, outer.width, Math.max(0, bottom - top))
}
