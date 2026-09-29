import { useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { useI18n } from '@/context/I18nContext'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SectionWrapper } from '@/components/ui/SectionWrapper'
import { CompareSlider } from '@/components/visuals/CompareSlider'
import { SECTION_IDS, SECTION_NUMBERS } from '@/lib/constants'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { desktopMotionQuery, mobileMotionQuery } from '@/lib/motionProfile'

export function Solution() {
  const { content } = useI18n()
  const reduced = usePrefersReducedMotion()
  const stageRef = useRef<HTMLDivElement>(null)
  const [sweep, setSweep] = useState(reduced)

  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    if (reduced) {
      setSweep(true)
      return
    }

    const notes = stage.querySelectorAll<HTMLElement>('[data-solution-note]')
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia()
      const arm = () => setSweep(true)

      mm.add(mobileMotionQuery(), () => {
        gsap.from(notes, {
          y: 14,
          stagger: 0.06,
          duration: 0.35,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: stage,
            start: 'top 78%',
            once: true,
          },
          onComplete: arm,
        })
      })

      mm.add(desktopMotionQuery(), () => {
        const offsets = [
          { x: -52, y: -22, rotate: -8 },
          { x: 58, y: 10, rotate: 7 },
          { x: -28, y: 30, rotate: 5 },
          { x: 40, y: -12, rotate: -6 },
        ]
        gsap.fromTo(
          notes,
          {
            x: (index) => offsets[index]?.x ?? 0,
            y: (index) => offsets[index]?.y ?? 0,
            rotate: (index) => offsets[index]?.rotate ?? 0,
            autoAlpha: 1,
            scale: 1,
          },
          {
            x: 0,
            y: 0,
            rotate: 0,
            scale: 0.42,
            autoAlpha: 0,
            ease: 'none',
            stagger: 0.03,
            scrollTrigger: {
              trigger: stage,
              start: 'top 72%',
              end: 'top 30%',
              scrub: true,
              onUpdate: (self) => {
                if (self.progress >= 0.9) arm()
              },
              onEnter: (self) => {
                if (self.progress >= 0.9) arm()
              },
            },
          },
        )
      })
    }, stage)

    return () => ctx.revert()
  }, [reduced, content.problem.cards])

  return (
    <SectionWrapper id={SECTION_IDS.solution}>
      <SectionHeading
        number={SECTION_NUMBERS.solution}
        title={content.solution.title}
        label={content.nav.howItWorks}
      />
      <p className="mb-6 max-w-3xl text-muted leading-relaxed">{content.solution.text}</p>
      <div ref={stageRef} className="solution-assemble mx-auto max-w-3xl">
        <ul className="solution-notes" aria-hidden="true">
          {content.problem.cards.map((card, index) => (
            <li key={card.text} data-solution-note className="solution-note">
              <span>{String(index + 1).padStart(2, '0')}</span>
              {card.text}
            </li>
          ))}
        </ul>
        <div data-solution-form>
          <CompareSlider autoSweep={sweep} />
        </div>
      </div>
    </SectionWrapper>
  )
}
