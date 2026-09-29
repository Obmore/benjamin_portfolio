import { useLayoutEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { useI18n } from '@/context/I18nContext'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SectionWrapper } from '@/components/ui/SectionWrapper'
import { SECTION_IDS, SECTION_NUMBERS } from '@/lib/constants'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { desktopMotionQuery, mobileMotionQuery } from '@/lib/motionProfile'

const SCATTER = [
  { rotate: -6, x: -28, y: 40 },
  { rotate: 7, x: 32, y: 24 },
  { rotate: 4, x: -16, y: 48 },
  { rotate: -5, x: 22, y: 44 },
] as const

export function Problem() {
  const { content } = useI18n()
  const reduced = usePrefersReducedMotion()
  const listRef = useRef<HTMLUListElement>(null)

  useLayoutEffect(() => {
    const list = listRef.current
    if (!list || reduced) return
    const cards = list.querySelectorAll<HTMLElement>('[data-problem-card]')
    const callStrokes = list.querySelectorAll<SVGPathElement>('[data-call-stroke]')
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

      if (callStrokes.length) {
        callStrokes.forEach((stroke) => {
          const length = stroke.getTotalLength()
          gsap.set(stroke, { strokeDasharray: length, strokeDashoffset: length })
        })
        gsap.to(callStrokes, {
          strokeDashoffset: 0,
          duration: 0.7,
          stagger: 0.1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: list.querySelector('[data-call-icon]'),
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
          >
            <p className="font-mono text-[11px] tracking-wide text-line">
              {String(index + 1).padStart(2, '0')}
            </p>
            {index === 1 ? <PhoneCallMark /> : null}
            <p
              data-problem-text
              className="mt-2 text-sm leading-relaxed text-foreground md:text-base"
            >
              {card.text}
            </p>
          </li>
        ))}
      </ul>
    </SectionWrapper>
  )
}

function PhoneCallMark() {
  return (
    <svg
      className="problem-call"
      data-call-icon
      viewBox="0 0 32 32"
      width="28"
      height="28"
      aria-hidden="true"
    >
      <path
        data-call-stroke
        d="M8.2 20.2c-2-1.5-2.7-4-1.4-6 .4-.7 1.3-.9 2-.5l2.1 1.1c.6.3.8 1.1.5 1.7l-.6 1.3c2.8 2.3 5.1 2.8 7.7.8l1.2-.7c.6-.4 1.5-.2 1.8.5l1.2 2c.4.7.2 1.6-.5 2-2 1.3-4.6 2-7.5 1.2-3-.8-5.4-2.2-6.5-3.4Z"
      />
      <path data-call-stroke d="M19.6 8.6c2 1 3.5 2.6 4.3 4.6" />
      <path data-call-stroke d="M18.1 10.5c1.2.7 2.1 1.7 2.6 3" />
    </svg>
  )
}
