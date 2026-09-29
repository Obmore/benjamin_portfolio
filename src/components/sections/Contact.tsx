import { useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { useI18n } from '@/context/I18nContext'
import { Button } from '@/components/ui/Button'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SectionWrapper } from '@/components/ui/SectionWrapper'
import { EMAIL, LINKEDIN_URL, SECTION_IDS, SECTION_NUMBERS } from '@/lib/constants'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

export function Contact() {
  const { content } = useI18n()
  const [copied, setCopied] = useState(false)
  const reduced = usePrefersReducedMotion()
  const finaleRef = useRef<HTMLDivElement>(null)

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  useLayoutEffect(() => {
    const finale = finaleRef.current
    if (!finale) return
    if (reduced) {
      finale.classList.add('is-done')
      return
    }
    const sheet = finale.querySelector<HTMLElement>('[data-finale-sheet]')
    const envelope = finale.querySelector<HTMLElement>('[data-envelope]')
    const message = finale.querySelector<HTMLElement>('[data-finale-msg]')
    const ctx = gsap.context(() => {
      const showFinale = () => {
        finale.classList.add('is-done')
        if (message) gsap.set(message, { opacity: 1, y: 0, visibility: 'visible' })
        if (envelope) gsap.set(envelope, { opacity: 1, y: 0, scale: 1, visibility: 'visible' })
      }
      const markDone = (progress: number) => {
        if (progress >= 0.72) showFinale()
        else finale.classList.remove('is-done')
      }
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: finale,
          start: 'top 84%',
          end: 'top 62%',
          scrub: true,
          onUpdate: (self) => markDone(self.progress),
          onRefresh: (self) => markDone(self.progress),
          onLeave: showFinale,
        },
      })
      tl.fromTo(
        sheet,
        { rotateX: 0, y: 0, autoAlpha: 1, scale: 1 },
        { rotateX: 78, y: 28, autoAlpha: 0.05, scale: 0.72, ease: 'none' },
        0,
      )
      tl.fromTo(
        envelope,
        { opacity: 0, y: 18, scale: 0.9 },
        { opacity: 1, y: 0, scale: 1, ease: 'none' },
        0.22,
      )
      tl.fromTo(
        message,
        { opacity: 0, y: 10, visibility: 'visible' },
        { opacity: 1, y: 0, visibility: 'visible', ease: 'none' },
        0.42,
      )
    }, finale)
    return () => ctx.revert()
  }, [reduced])

  return (
    <SectionWrapper id={SECTION_IDS.contact}>
      <SectionHeading
        number={SECTION_NUMBERS.contact}
        title={content.contact.title}
        label={content.nav.contact}
      />
      <p className="mb-6 max-w-2xl text-muted leading-relaxed">{content.contact.text}</p>
      <div className="signal-finale">
        <Button
          data-cta="assess"
          href={`mailto:${EMAIL}?subject=${encodeURIComponent(content.contact.mailSubject)}`}
        >
          {content.hero.ctaAssess}
        </Button>
      </div>
      <div className="mt-6">
        <p className="text-sm text-muted">{content.contact.orWrite}</p>
        <p
          id="kapcsolat-email"
          data-contact-email
          className="mt-1 select-all break-all font-mono text-base text-foreground"
        >
          {EMAIL}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void copyEmail()}
            aria-label={content.common.copyEmail}
          >
            {copied ? content.common.emailCopied : content.common.copyEmail}
          </Button>
        </div>
        <p className="sr-only" role="status">
          {copied ? content.common.emailCopied : ''}
        </p>
      </div>
      <div ref={finaleRef} className="contact-finale mt-10">
        <div className="finale-stage" aria-hidden="true">
          <div className="finale-sheet" data-finale-sheet>
            <p>{content.hero.paperTitle}</p>
            {content.hero.paperRows.map((row) => (
              <span key={`finale-${row.label}`}>
                {row.label}: {row.value}
              </span>
            ))}
          </div>
          <div className="envelope" data-envelope>
            <svg className="envelope-svg" viewBox="0 0 200 128" aria-hidden="true">
              <rect className="envelope-fill envelope-stroke" x="10" y="34" width="180" height="84" />
              <path className="envelope-flap-fill envelope-stroke" d="M10 34 L100 8 L190 34 Z" />
              <path className="envelope-stroke" d="M10 34 L100 88 L190 34" />
              <circle className="envelope-check-ring" cx="100" cy="72" r="13" />
              <path className="envelope-check" d="M93 72 L98 78 L109 64" />
            </svg>
          </div>
        </div>
        <p data-finale-msg className="finale-copy text-sm font-medium text-foreground">
          {content.contact.finale}
        </p>
      </div>
      <div className="crop-marks mt-8 max-w-xl divide-y divide-line/20 rounded-[6px] border border-line/25 bg-surface">
        <div className="grid gap-2 px-5 py-4 sm:grid-cols-[7rem_1fr]">
          <p className="font-mono text-xs uppercase tracking-wider text-line">
            {content.common.locationLabel}
          </p>
          <p className="text-foreground">{content.contact.location}</p>
        </div>
        <div className="grid gap-2 px-5 py-4 sm:grid-cols-[7rem_1fr]">
          <p className="font-mono text-xs uppercase tracking-wider text-line">
            {content.common.linkedInLabel}
          </p>
          <a
            href={LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-foreground hover:text-line"
          >
            {content.contact.linkedIn}
          </a>
        </div>
      </div>
    </SectionWrapper>
  )
}
