import { FORBIDDEN_HASH_IDS, replaceLocationHash, resolveAnchor } from '@/lib/hash'
import { scrollToSection } from '@/hooks/useActiveSection'
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
  replaceLocationHash(null)
  window.scrollTo({
    top: 0,
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
  })
}

export function onResolvedHashClick(event: MouseEvent<HTMLAnchorElement>, id: string) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return
  }
  event.preventDefault()
  navigateTo(id)
}
