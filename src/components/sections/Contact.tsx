import { useEffect, useRef, useState, type RefObject } from 'react'
import { useI18n } from '@/context/I18nContext'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SectionWrapper } from '@/components/ui/SectionWrapper'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { copyTextWithClipboardApi, isClipboardWriteAvailable } from '@/lib/contact'
import { LINKEDIN_URL, SECTION_IDS, SECTION_SHEETS } from '@/lib/constants'
import { OrderLink } from '@/components/ui/OrderLink'

export function Contact() {
  const { content } = useI18n()

  return (
    <SectionWrapper id={SECTION_IDS.contact}>
      <SectionHeading title={content.contact.title} label={content.nav.contact} sheet={SECTION_SHEETS.contact} />
      <p className="mb-10 max-w-2xl text-muted leading-relaxed">{content.contact.text}</p>
      <p className="mb-10">
        <OrderLink className="text-accent underline-offset-4 hover:underline focus-visible:underline" />
      </p>
      <div className="rounded-2xl border border-line bg-surface/90 p-6 md:p-8">
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
  const linkRef = useRef<HTMLAnchorElement>(null)

  return (
    <div className="space-y-5">
      <div>
        <p className="font-mono text-xs uppercase tracking-wider text-accent">
          {content.common.emailLabel}
        </p>
        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <a
            ref={linkRef}
            href={`mailto:${email}`}
            className="select-text min-w-0 break-all text-foreground hover:text-accent"
          >
            {email}
          </a>
          <CopyEmailButton email={email} linkRef={linkRef} />
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

function CopyEmailButton({
  email,
  linkRef,
}: {
  email: string
  linkRef: RefObject<HTMLAnchorElement | null>
}) {
  const { content } = useI18n()
  const [visible, setVisible] = useState(isClipboardWriteAvailable)
  const [copied, setCopied] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const resetTimeoutRef = useRef<number | null>(null)
  const announceFrameRef = useRef<number | null>(null)

  useEffect(() => {
    setVisible(isClipboardWriteAvailable())
  }, [])

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current !== null) {
        window.clearTimeout(resetTimeoutRef.current)
      }
      if (announceFrameRef.current !== null) {
        window.cancelAnimationFrame(announceFrameRef.current)
      }
    }
  }, [])

  if (!visible) return null

  const label = copied ? content.contact.copied : content.contact.copyAddress

  function clearPendingAnnounce() {
    if (announceFrameRef.current !== null) {
      window.cancelAnimationFrame(announceFrameRef.current)
      announceFrameRef.current = null
    }
  }

  function announceCopied() {
    setAnnouncement('')
    clearPendingAnnounce()
    announceFrameRef.current = window.requestAnimationFrame(() => {
      setAnnouncement(content.contact.copiedAnnouncement)
      announceFrameRef.current = null
    })
  }

  async function handleCopy() {
    const ok = await copyTextWithClipboardApi(email)
    if (!ok) {
      clearPendingAnnounce()
      setCopied(false)
      setAnnouncement('')
      linkRef.current?.focus()
      setVisible(false)
      return
    }

    setCopied(true)
    announceCopied()
    if (resetTimeoutRef.current !== null) {
      window.clearTimeout(resetTimeoutRef.current)
    }
    resetTimeoutRef.current = window.setTimeout(() => {
      setCopied(false)
      setAnnouncement('')
      resetTimeoutRef.current = null
    }, 2000)
  }

  return (
    <>
      <Button type="button" variant="outline" className="shrink-0" onClick={handleCopy}>
        {copied ? <Icon name="check" /> : null}
        {label}
      </Button>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
    </>
  )
}
