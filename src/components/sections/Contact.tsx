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
    if (!finale || reduced) return
    const sheet = finale.querySelector<HTMLElement>('[data-envelope]')
    const message = finale.querySelector<HTMLElement>('[data-finale-msg]')
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: finale,
          start: 'top 85%',
          end: 'top 30%',
          scrub: true,
        },
      })
      tl.fromTo(sheet, { rotateX: 0, y: 0, autoAlpha: 1 }, { rotateX: 75, y: -40, autoAlpha: 0.15, ease: 'none' })
      tl.fromTo(message, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, ease: 'none' }, 0.45)
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
        <div className="envelope" data-envelope aria-hidden="true">
          <span className="envelope-flap" />
          <span className="envelope-body" />
        </div>
        <p data-finale-msg className="finale-copy mt-4 text-sm font-medium text-foreground">
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
