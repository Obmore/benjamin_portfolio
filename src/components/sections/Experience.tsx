import { useEffect, useRef, useState } from 'react'
import { useI18n } from '@/context/I18nContext'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SectionWrapper } from '@/components/ui/SectionWrapper'
import { Reveal } from '@/components/ui/Reveal'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { SECTION_IDS, SECTION_NUMBERS } from '@/lib/constants'

export function Experience() {
  const { content } = useI18n()
  const reduced = usePrefersReducedMotion()
  const railRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Array<HTMLElement | null>>([])
  const [lit, setLit] = useState<boolean[]>(() => content.experience.items.map(() => true))

  useEffect(() => {
    const rail = railRef.current
    if (!rail) return

    const supportsTimeline =
      typeof CSS !== 'undefined' && CSS.supports('animation-timeline: view()')

    const update = () => {
      const rect = rail.getBoundingClientRect()
      const start = window.innerHeight * 0.8
      const traveled = start - rect.top
      const progress = Math.min(1, Math.max(0, traveled / Math.max(rect.height, 1)))
      if (!supportsTimeline && !reduced) {
        rail.style.setProperty('--pcb-progress', String(progress))
      }

      const next = itemRefs.current.map((el) => {
        if (!el) return true
        const top = el.getBoundingClientRect().top
        return reduced || top < window.innerHeight * 0.72
      })
      setLit(next)
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [content.experience.items.length, reduced])

  return (
    <SectionWrapper id={SECTION_IDS.experience}>
      <SectionHeading
        number={SECTION_NUMBERS.experience}
        title={content.experience.title}
        label={content.nav.experience}
      />
      <div ref={railRef} className="pcb-timeline">
        <div className="pcb-rail" aria-hidden="true">
          <div className="pcb-line" />
        </div>
        <div className="space-y-8">
          {content.experience.items.map((item, index) => (
            <article
              key={`${item.title}-${item.period}`}
              ref={(el) => {
                itemRefs.current[index] = el
              }}
              className="relative grid gap-2 pl-8 md:grid-cols-[10rem_1fr] md:gap-8 md:pl-0"
            >
              <div
                className={`solder-pad absolute left-[2px] top-1.5 md:left-[calc(10rem+0.45rem)] ${
                  lit[index] ? 'is-lit' : ''
                }`}
                aria-hidden="true"
              />
              <p className="font-mono text-xs text-line md:pt-0.5">{item.period}</p>
              <Reveal>
                <h3 className="text-lg font-medium text-foreground">{item.title}</h3>
                {item.company ? <p className="mt-1 text-sm text-muted">{item.company}</p> : null}
                <ul className="mt-3 space-y-1.5">
                  {item.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-2 text-sm leading-relaxed text-muted">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-line" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </Reveal>
            </article>
          ))}
        </div>
      </div>
    </SectionWrapper>
  )
}
