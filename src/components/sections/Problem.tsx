import { useLayoutEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { useI18n } from '@/context/I18nContext'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SectionWrapper } from '@/components/ui/SectionWrapper'
import { SECTION_IDS, SECTION_NUMBERS } from '@/lib/constants'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

export function Problem() {
  const { content } = useI18n()
  const reduced = usePrefersReducedMotion()
  const listRef = useRef<HTMLUListElement>(null)

  useLayoutEffect(() => {
    const list = listRef.current
    if (!list || reduced) return
    const cards = list.querySelectorAll<HTMLElement>('[data-problem-card]')
    const missing = list.querySelector<HTMLElement>('[data-missing-size]')
    const ctx = gsap.context(() => {
      gsap.from(cards, {
        y: 40,
        rotate: -2,
        stagger: 0.15,
        duration: 0.7,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: list,
          start: 'top 75%',
          once: true,
        },
      })
      if (missing) {
        gsap.to(missing, {
          autoAlpha: 0.15,
          duration: 0.45,
          repeat: 5,
          yoyo: true,
          ease: 'steps(2)',
          scrollTrigger: {
            trigger: missing,
            start: 'top 80%',
            once: true,
          },
        })
      }
    }, list)
    return () => ctx.revert()
  }, [reduced, content.problem.cards])

  return (
    <SectionWrapper id={SECTION_IDS.problem}>
      <SectionHeading
        number={SECTION_NUMBERS.problem}
        title={content.problem.title}
        label={content.problem.title}
      />
      <ul ref={listRef} className="grid gap-3 md:grid-cols-2">
        {content.problem.cards.map((card, index) => (
          <li
            key={card.text}
            data-problem-card
            className="crop-marks rounded-[6px] border border-line/25 bg-surface p-4 md:p-5"
            style={{ transform: `rotate(${index % 2 === 0 ? -1.2 : 1.4}deg)` }}
          >
            <p className="font-mono text-[11px] tracking-wide text-line">
              {String(index + 1).padStart(2, '0')}
            </p>
            {card.missingSize ? (
              <p
                data-missing-size
                className="mt-2 font-mono text-sm text-cta"
              >
                {content.hero.paperRows[0]?.label}
              </p>
            ) : null}
            <p className="mt-2 text-sm leading-relaxed text-foreground md:text-base">
              {card.text}
            </p>
          </li>
        ))}
      </ul>
    </SectionWrapper>
  )
}
