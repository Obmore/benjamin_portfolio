import { useEffect, useRef, useState } from 'react'
import { useI18n } from '@/context/I18nContext'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SectionWrapper } from '@/components/ui/SectionWrapper'
import { Button } from '@/components/ui/Button'
import { copyTextWithClipboardApi, isClipboardWriteAvailable } from '@/lib/contact'
import { LINKEDIN_URL, SECTION_IDS } from '@/lib/constants'

export function Contact() {
  const { content } = useI18n()

  return (
    <SectionWrapper id={SECTION_IDS.contact}>
      <SectionHeading title={content.contact.title} label={content.nav.contact} />
      <p className="mb-10 max-w-2xl text-muted leading-relaxed">{content.contact.text}</p>
      <div className="rounded-2xl border border-border/70 bg-surface/50 p-6 backdrop-blur-md md:p-8">
        <p className="mb-8 max-w-2xl text-muted leading-relaxed">{content.contact.prompt}</p>
        <ContactInfo
          email={content.contact.email}
          location={content.contact.location}
          linkedIn={content.contact.linkedIn}
        />
      </div>
    </SectionWrapper>
  )
}

interface ContactInfoProps {
  email: string
  location: string
  linkedIn: string
}

function ContactInfo({ email, location, linkedIn }: ContactInfoProps) {
  const { content } = useI18n()

  return (
    <div className="space-y-5">
      <div>
        <p className="font-mono text-xs uppercase tracking-wider text-accent">
          {content.common.emailLabel}
        </p>
        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <a
            href={`mailto:${email}`}
            className="select-text min-w-0 break-all text-foreground hover:text-accent"
          >
            {email}
          </a>
          <CopyEmailButton email={email} />
        </div>
      </div>
      <div>
        <p className="font-mono text-xs uppercase tracking-wider text-accent">
          {content.common.locationLabel}
        </p>
        <p className="mt-1 text-foreground">{location}</p>
      </div>
      <div>
        <p className="font-mono text-xs uppercase tracking-wider text-accent">
          {content.common.linkedInLabel}
        </p>
        <a
          href={LINKEDIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 block text-foreground hover:text-accent"
        >
          {linkedIn}
        </a>
      </div>
    </div>
  )
}

function CopyEmailButton({ email }: { email: string }) {
  const { content } = useI18n()
  const [visible, setVisible] = useState(isClipboardWriteAvailable)
  const [copied, setCopied] = useState(false)
  const resetTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    setVisible(isClipboardWriteAvailable())
  }, [])

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current !== null) {
        window.clearTimeout(resetTimeoutRef.current)
      }
    }
  }, [])

  if (!visible) return null

  const label = copied ? content.contact.copied : content.contact.copyAddress

  async function handleCopy() {
    const ok = await copyTextWithClipboardApi(email)
    if (!ok) {
      setCopied(false)
      setVisible(false)
      return
    }

    setCopied(true)
    if (resetTimeoutRef.current !== null) {
      window.clearTimeout(resetTimeoutRef.current)
    }
    resetTimeoutRef.current = window.setTimeout(() => {
      setCopied(false)
      resetTimeoutRef.current = null
    }, 2000)
  }

  return (
    <>
      <Button type="button" variant="outline" className="shrink-0" onClick={handleCopy}>
        {label}
      </Button>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {copied ? content.contact.copied : ''}
      </span>
    </>
  )
}
