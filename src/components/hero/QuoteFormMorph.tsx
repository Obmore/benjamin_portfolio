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
  const form = content.services.form

  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage || reduced) return

    const pin = document.querySelector<HTMLElement>('[data-hero-pin]')
    const sheet = stage.querySelector<HTMLElement>('[data-paper]')
    const inbox = stage.querySelector<HTMLElement>('[data-inbox]')
    const rows = stage.querySelectorAll<HTMLElement>('[data-paper-row]')
    const values = stage.querySelectorAll<HTMLElement>('[data-paper-value]')
    const submit = stage.querySelector<HTMLElement>('[data-paper-submit]')
    const caret = stage.querySelector<HTMLElement>('[data-paper-caret]')
    if (!sheet || !rows.length) return

    const ctx = gsap.context(() => {
      gsap.from(rows, {
        y: 18,
        rotate: -3,
        duration: 0.7,
        stagger: 0.08,
        ease: 'expo.out',
        delay: 0.12,
      })

      const mm = gsap.matchMedia()
      mm.add(desktopMotionQuery(), () => {
        if (!pin) return
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: pin,
            start: 'top top',
            end: () => `+=${Math.round(window.innerHeight * 1.05)}`,
            pin: true,
            scrub: 0.65,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        })
        buildStory(tl, { sheet, inbox, rows, values, submit, caret, full: true })
        return () => tl.kill()
      })

      mm.add(mobileMotionQuery(), () => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: stage,
            start: 'top 78%',
            end: 'bottom 18%',
            scrub: 0.4,
            invalidateOnRefresh: true,
          },
        })
        buildStory(tl, { sheet, inbox, rows, values, submit, caret, full: false })
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
      className="paper-stage"
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
          {form.submit}
        </span>
        <span className="paper-caret" data-paper-caret aria-hidden="true" />
      </div>
      <aside className="inbox-card" data-inbox>
        <p className="inbox-kicker">{content.hero.inboxLabel}</p>
        <div>
          <div className="inbox-row">
            <p>{form.previewFrom}</p>
            <p>
              {form.sampleName}
              <span className="block text-muted">{form.sampleCompany}</span>
            </p>
          </div>
          <div className="inbox-row">
            <p>{form.previewTo}</p>
            <p>{form.previewRecipient}</p>
          </div>
          <div className="inbox-row">
            <p>{form.previewSubjectLabel}</p>
            <p>{form.previewSubject}</p>
          </div>
          {content.hero.paperRows.map((row) => (
            <div key={`inbox-${row.label}`} className="inbox-row">
              <p>{row.label}</p>
              <p>{row.value}</p>
            </div>
          ))}
        </div>
      </aside>
    </div>
  )
}

function buildStory(
  tl: gsap.core.Timeline,
  parts: {
    sheet: HTMLElement
    inbox: HTMLElement | null
    rows: NodeListOf<HTMLElement>
    values: NodeListOf<HTMLElement>
    submit: HTMLElement | null
    caret: HTMLElement | null
    full: boolean
  },
) {
  const { sheet, inbox, rows, values, submit, caret, full } = parts
  const caretTop = (row: HTMLElement) => row.offsetTop + 16

  tl.to(
    sheet,
    {
      rotate: -8,
      rotateX: 16,
      y: 6,
      boxShadow: '0 28px 54px rgb(11 37 69 / 0.2)',
      duration: 0.16,
      ease: 'power2.out',
    },
    0,
  )
  tl.to(
    rows,
    {
      y: -12,
      rotateX: 16,
      rotate: 0,
      z: 14,
      stagger: 0.045,
      duration: 0.18,
      ease: 'power2.out',
    },
    0.06,
  )
  tl.to(
    sheet,
    {
      rotate: 0,
      rotateX: 0,
      y: 0,
      boxShadow: '0 12px 28px rgb(11 37 69 / 0.1)',
      duration: 0.2,
    },
    0.28,
  )
  tl.to(rows, { y: 0, rotateX: 0, z: 0, duration: 0.16 }, 0.3)
  tl.to(
    sheet,
    {
      duration: 0.01,
      onStart: () => {
        rows.forEach((row) => row.classList.add('is-field'))
        values.forEach((value) => {
          value.classList.add('is-typed')
          gsap.set(value, { clipPath: 'inset(0 100% 0 0)' })
        })
      },
      onReverseComplete: () => {
        rows.forEach((row) => row.classList.remove('is-field', 'is-focus'))
        values.forEach((value) => {
          value.classList.remove('is-typed')
          gsap.set(value, { clipPath: 'none' })
        })
      },
    },
    0.4,
  )

  rows.forEach((row, index) => {
    const at = 0.44 + index * 0.1
    const value = values[index]
    tl.to(
      row,
      {
        duration: 0.01,
        onStart: () => {
          rows.forEach((item) => item.classList.toggle('is-focus', item === row))
        },
      },
      at,
    )
    if (value) {
      tl.to(value, { clipPath: 'inset(0 0% 0 0)', duration: 0.09, ease: 'none' }, at)
    }
    if (caret) {
      tl.to(caret, { opacity: 1, duration: 0.03 }, at)
      tl.to(caret, { top: () => caretTop(row), duration: 0.08, ease: 'power2.out' }, at)
    }
  })

  tl.to(submit, { y: 0, scale: 1, duration: 0.1 }, 0.7)
  tl.to(
    sheet,
    {
      duration: 0.01,
      onStart: () => {
        rows.forEach((row) => row.classList.remove('is-focus'))
        if (caret) gsap.set(caret, { opacity: 0 })
      },
    },
    0.72,
  )

  if (full && inbox) {
    tl.to(
      sheet,
      {
        rotateX: 72,
        y: -80,
        scale: 0.7,
        opacity: 0.08,
        duration: 0.18,
        ease: 'power2.in',
      },
      0.76,
    )
    tl.fromTo(
      inbox,
      { autoAlpha: 0, y: 42, rotateX: -8, scale: 0.94 },
      { autoAlpha: 1, y: 0, rotateX: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
      0.8,
    )
  } else if (inbox) {
    tl.to(inbox, { autoAlpha: 1, y: 0, duration: 0.16 }, 0.78)
  }
}
