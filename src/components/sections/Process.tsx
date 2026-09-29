import { useLayoutEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { useI18n } from '@/context/I18nContext'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SectionWrapper } from '@/components/ui/SectionWrapper'
import { SECTION_IDS, SECTION_NUMBERS } from '@/lib/constants'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

export function Process() {
  const { content } = useI18n()
  const reduced = usePrefersReducedMotion()
  const boardRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const board = boardRef.current
    if (!board || reduced) return
    const line = board.querySelector<HTMLElement>('[data-process-line]')
    const steps = board.querySelectorAll<HTMLElement>('[data-process-step]')
    const ctx = gsap.context(() => {
      if (line) {
        gsap.fromTo(
          line,
          { scaleX: 0 },
          {
            scaleX: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: board,
              start: 'top 75%',
              end: 'bottom 45%',
              scrub: true,
            },
          },
        )
      }
      gsap.from(steps, {
        y: 16,
        stagger: 0.12,
        duration: 0.45,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: board,
          start: 'top 70%',
          end: 'bottom 50%',
          scrub: true,
        },
      })
    }, board)
    return () => ctx.revert()
  }, [reduced, content.services.processSteps])

  return (
    <SectionWrapper id={SECTION_IDS.process}>
      <SectionHeading
        number={SECTION_NUMBERS.process}
        title={content.process.title}
        label={content.process.title}
        subtitle={content.process.lead}
      />
      <div ref={boardRef} className="process-board">
        <div className="process-line-wrap" aria-hidden="true">
          <div className="process-line-fill" data-process-line />
        </div>
        <ol className="process-nodes">
          {content.services.processSteps.map((step, index) => (
            <li key={step.title} data-process-step className="process-node">
              <span className="process-pad" aria-hidden="true" />
              <p className="process-index">{String(index + 1).padStart(2, '0')}</p>
              <p className="process-node-title">{step.title}</p>
              <p className="process-node-desc">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </SectionWrapper>
  )
}
