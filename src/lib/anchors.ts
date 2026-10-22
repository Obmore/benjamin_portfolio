import { FORBIDDEN_HASH_IDS, replaceLocationHash, resolveAnchor } from '@/lib/hash'
import { cancelPendingSnap, scrollToSection } from '@/hooks/useActiveSection'
import { prefersReducedMotion } from '@/lib/motion'
import type { MouseEvent } from 'react'

export { resolveAnchor } from '@/lib/hash'

export function navigateTo(id: string) {
  const resolved = resolveAnchor(id)
  if (!resolved || FORBIDDEN_HASH_IDS.has(resolved)) {
    replaceLocationHash(null)
    return
  }
  // Keep ordinary browsing URLs clean; hrefs still support shared deep links.
  replaceLocationHash(null)
  scrollToSection(resolved)
}

export function goToPageTop() {
  cancelPendingSnap()
  replaceLocationHash(null)
  window.scrollTo({
    top: 0,
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
  })
}

/** A plain primary-button click: the only kind an in-page anchor handler may take over. */
export function isPlainPrimaryClick(event: MouseEvent<HTMLAnchorElement>) {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  )
}

export function onResolvedHashClick(event: MouseEvent<HTMLAnchorElement>, id: string) {
  if (!isPlainPrimaryClick(event)) return
  event.preventDefault()
  navigateTo(id)
}
