import { useLayoutEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { useI18n } from '@/context/I18nContext'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { desktopMotionQuery, mobileMotionQuery } from '@/lib/motionProfile'
import './quoteFormMorph.css'

export function QuoteFormMorph() {
  const { content } = useI18n()
  const reduced = usePrefersReducedMotion()
  const stageRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage || reduced) return

    const pin = document.querySelector<HTMLElement>('[data-hero-pin]')
    const sheet = stage.querySelector<HTMLElement>('[data-paper]')
    const rows = stage.querySelectorAll<HTMLElement>('[data-paper-row]')
    const values = stage.querySelectorAll<HTMLElement>('[data-paper-value]')
    const submit = stage.querySelector<HTMLElement>('[data-paper-submit]')
    if (!sheet || !rows.length) return

    const ctx = gsap.context(() => {
      gsap.from(rows, {
        y: 18,
        rotate: -4,
        duration: 0.7,
        stagger: 0.1,
        ease: 'expo.out',
        delay: 0.25,
      })

      const mm = gsap.matchMedia()
      mm.add(desktopMotionQuery(), () => {
        if (!pin) return
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: pin,
            start: 'top top+=56',
            end: () => `+=${Math.round(window.innerHeight * 1.2)}`,
            pin: true,
            scrub: true,
            invalidateOnRefresh: true,
          },
        })
        buildMorph(tl, sheet, rows, values, submit)
        return () => tl.kill()
      })

      mm.add(mobileMotionQuery(), () => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: stage,
            start: 'top 70%',
            end: 'bottom 35%',
            scrub: true,
            invalidateOnRefresh: true,
          },
        })
        buildMorph(tl, sheet, rows, values, submit)
        return () => tl.kill()
      })
    }, stage)

    return () => ctx.revert()
  }, [reduced, content.hero.paperRows])

  return (
    <div
      ref={stageRef}
      role="img"
      aria-label={content.hero.morphAria}
      className="paper-stage crop-marks"
    >
      <div className="paper-sheet" data-paper>
        <p className="paper-head">{content.hero.paperTitle}</p>
        {content.hero.paperRows.map((row) => (
          <div key={row.label} className="paper-row" data-paper-row>
            <span className="paper-label">{row.label}</span>
            <span className="paper-value" data-paper-value>
              {row.value}
            </span>
          </div>
        ))}
        <span className="paper-submit" data-paper-submit>
          {content.services.form.submit}
        </span>
      </div>
    </div>
  )
}

function buildMorph(
  tl: gsap.core.Timeline,
  sheet: HTMLElement,
  rows: NodeListOf<HTMLElement>,
  values: NodeListOf<HTMLElement>,
  submit: HTMLElement | null,
) {
  tl.to(sheet, { rotate: 0, boxShadow: '0 0 0 transparent', duration: 0.4, ease: 'power2.out' }, 0)
  tl.to(rows, { y: 0, rotate: 0, stagger: 0.06, duration: 0.35, ease: 'power2.out' }, 0.05)
  tl.add(() => {
    rows.forEach((row) => row.classList.add('is-field'))
    values.forEach((value) => value.classList.add('is-typed'))
  }, 0.45)
  tl.fromTo(
    submit,
    { autoAlpha: 0.35, y: 8, scale: 0.96 },
    { autoAlpha: 1, y: 0, scale: 1, duration: 0.25, ease: 'power2.out' },
    0.7,
  )
}
