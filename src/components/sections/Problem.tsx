import { useLayoutEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { useI18n } from '@/context/I18nContext'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SectionWrapper } from '@/components/ui/SectionWrapper'
import { SECTION_IDS, SECTION_NUMBERS } from '@/lib/constants'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { desktopMotionQuery, mobileMotionQuery } from '@/lib/motionProfile'

const SCATTER = [
  { rotate: -8, x: -36, y: 48 },
  { rotate: 9, x: 42, y: 28 },
  { rotate: 5, x: -18, y: 64 },
  { rotate: -6, x: 30, y: 56 },
] as const

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
      const mm = gsap.matchMedia()

      mm.add(mobileMotionQuery(), () => {
        gsap.from(cards, {
          y: 28,
          rotate: -2,
          stagger: 0.12,
          duration: 0.55,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: list,
            start: 'top 78%',
            once: true,
          },
        })
      })

      mm.add(desktopMotionQuery(), () => {
        cards.forEach((card, index) => {
          const scatter = SCATTER[index] ?? SCATTER[0]
          gsap.fromTo(
            card,
            { y: scatter.y + 40, x: scatter.x, rotate: scatter.rotate * 1.6, rotateX: 28 },
            {
              y: 0,
              x: 0,
              rotate: scatter.rotate,
              rotateX: 0,
              duration: 0.8,
              ease: 'expo.out',
              scrollTrigger: {
                trigger: list,
                start: 'top 78%',
                once: true,
              },
            },
          )
        })

        gsap.to(cards, {
          x: (index) => (index % 2 === 0 ? 36 : -28),
          y: (index) => 90 + index * 14,
          rotate: 0,
          scale: 0.88,
          opacity: 0.12,
          stagger: 0.03,
          ease: 'none',
          scrollTrigger: {
            trigger: list,
            start: 'center 36%',
            endTrigger: '#megoldas',
            end: 'top 42%',
            scrub: true,
          },
        })
      })

      if (missing) {
        gsap.to(missing, {
          autoAlpha: 0.12,
          duration: 0.38,
          repeat: 7,
          yoyo: true,
          ease: 'steps(2)',
          scrollTrigger: {
            trigger: missing,
            start: 'top 82%',
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
      <ul ref={listRef} className="problem-desk">
        {content.problem.cards.map((card, index) => (
          <li
            key={card.text}
            data-problem-card
            className="problem-card crop-marks rounded-[6px] p-4 md:p-5"
            style={{ transform: `rotate(${SCATTER[index]?.rotate ?? 0}deg)` }}
          >
            <p className="font-mono text-[11px] tracking-wide text-line">
              {String(index + 1).padStart(2, '0')}
            </p>
            {card.missingSize ? (
              <p data-missing-size className="problem-missing">
                <span className="problem-missing-label">{content.hero.paperRows[0]?.label}</span>
                <span className="problem-missing-field" aria-hidden="true" />
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
