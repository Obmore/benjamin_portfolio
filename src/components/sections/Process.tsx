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
    const line = board.querySelector<SVGGeometryElement>('[data-process-line]')
    const steps = board.querySelectorAll<HTMLElement>('[data-process-step]')
    const ctx = gsap.context(() => {
      if (line) {
        const length = line.getTotalLength()
        gsap.set(line, { strokeDasharray: length, strokeDashoffset: length })
        gsap.to(line, {
          strokeDashoffset: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: board,
            start: 'top 75%',
            end: 'bottom 45%',
            scrub: true,
          },
        })
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
    <SectionWrapper id={SECTION_IDS.process} className="process-diagram">
      <SectionHeading
        number={SECTION_NUMBERS.process}
        title={content.process.title}
        label={content.process.title}
        subtitle={content.process.lead}
      />
      <div ref={boardRef} className="process-board">
        <svg
          className="process-trace process-trace-desk"
          viewBox="0 0 100 8"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            data-process-line
            d="M2 4 H98"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-line"
          />
        </svg>
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
