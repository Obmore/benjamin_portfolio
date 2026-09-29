import { useLayoutEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { useI18n } from '@/context/I18nContext'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SectionWrapper } from '@/components/ui/SectionWrapper'
import { SECTION_IDS, SECTION_NUMBERS } from '@/lib/constants'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { desktopMotionQuery, mobileMotionQuery } from '@/lib/motionProfile'

export function Process() {
  const { content } = useI18n()
  const reduced = usePrefersReducedMotion()
  const pinRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const pin = pinRef.current
    if (!pin) return
    const line = pin.querySelector<HTMLElement>('[data-process-line]')
    const steps = [...pin.querySelectorAll<HTMLElement>('[data-process-step]')]

    const setActive = (progress: number) => {
      const count = Math.max(steps.length - 1, 1)
      const lit = reduced ? steps.length - 1 : Math.round(progress * count)
      steps.forEach((step, index) => {
        step.classList.toggle('is-active', index <= lit)
      })
    }

    if (reduced) {
      setActive(1)
      return
    }

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia()

      mm.add(mobileMotionQuery(), () => {
        if (line) {
          gsap.fromTo(
            line,
            { scaleY: 0 },
            {
              scaleY: 1,
              ease: 'none',
              scrollTrigger: {
                trigger: pin,
                start: 'top 75%',
                end: 'bottom 45%',
                scrub: true,
                onUpdate: (self) => setActive(self.progress),
              },
            },
          )
        }
        gsap.from(steps, {
          y: 16,
          stagger: 0.1,
          duration: 0.4,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: pin,
            start: 'top 72%',
            once: true,
          },
        })
      })

      mm.add(desktopMotionQuery(), () => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: pin,
            start: 'center center',
            end: () => `+=${Math.round(window.innerHeight * 0.72)}`,
            pin: true,
            scrub: 0.5,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => setActive(self.progress),
          },
        })
        if (line) tl.fromTo(line, { scaleX: 0 }, { scaleX: 1, ease: 'none' }, 0)
        tl.from(
          steps,
          { y: 18, stagger: 0.08, duration: 0.2, ease: 'power2.out' },
          0,
        )
        return () => tl.kill()
      })
    }, pin)
    return () => ctx.revert()
  }, [reduced, content.services.processSteps])

  return (
    <SectionWrapper id={SECTION_IDS.process}>
      <div ref={pinRef} className="process-pin">
        <SectionHeading
          number={SECTION_NUMBERS.process}
          title={content.process.title}
          label={content.process.title}
          subtitle={content.process.lead}
        />
        <div className="process-board">
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
      </div>
    </SectionWrapper>
  )
}
