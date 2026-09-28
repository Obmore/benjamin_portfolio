import { useState } from 'react'
import { useI18n } from '@/context/I18nContext'
import { Button } from '@/components/ui/Button'
import { Reveal } from '@/components/ui/Reveal'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SectionWrapper } from '@/components/ui/SectionWrapper'
import { EMAIL, LINKEDIN_URL, SECTION_IDS, SECTION_NUMBERS } from '@/lib/constants'

export function Contact() {
  const { content } = useI18n()
  const [copied, setCopied] = useState(false)

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <SectionWrapper id={SECTION_IDS.contact}>
      <SectionHeading
        number={SECTION_NUMBERS.contact}
        title={content.contact.title}
        label={content.nav.contact}
      />
      <Reveal>
        <p className="mb-8 max-w-2xl text-muted leading-relaxed">{content.contact.text}</p>
      </Reveal>
      <div className="crop-marks max-w-xl divide-y divide-line/20 rounded-[6px] border border-line/25 bg-surface">
        <div className="grid gap-2 px-5 py-4 sm:grid-cols-[7rem_1fr] sm:items-start">
          <p className="font-mono text-xs uppercase tracking-wider text-line">
            {content.common.emailLabel}
          </p>
          <div>
            <p
              id="kapcsolat-email"
              data-contact-email
              className="select-all break-all font-mono text-base text-foreground"
            >
              {EMAIL}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button href={`mailto:${EMAIL}`} className="max-w-full break-all">
                {EMAIL}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void copyEmail()}
                aria-label={content.common.copyEmail}
              >
                {copied ? (
                  <svg
                    className="check-draw is-on h-4 w-4"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      d="M5 12.5 L10 17.5 L19 7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect x="8" y="8" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M16 8V6.5A1.5 1.5 0 0 0 14.5 5h-9A1.5 1.5 0 0 0 4 6.5v9A1.5 1.5 0 0 0 5.5 17H8" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                )}
                {copied ? content.common.emailCopied : content.common.copyEmail}
              </Button>
            </div>
            <p className="sr-only" role="status">
              {copied ? content.common.emailCopied : ''}
            </p>
          </div>
        </div>
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
