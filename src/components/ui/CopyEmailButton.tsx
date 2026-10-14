import { useEffect, useRef, useState, type RefObject } from 'react'
import { useI18n } from '@/context/useI18n'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { copyTextWithClipboardApi, isClipboardWriteAvailable } from '@/lib/contact'

/** Shown only where the Clipboard API works; on failure focus returns to the visible address. */
export function CopyEmailButton({
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
