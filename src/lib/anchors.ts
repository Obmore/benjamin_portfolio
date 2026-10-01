import { ANCHOR_ALIASES } from '@/lib/constants'
import { scrollToSection } from '@/hooks/useActiveSection'

export function resolveAnchor(hash: string): string {
  const id = hash.replace(/^#/, '')
  if (!id) return id
  return ANCHOR_ALIASES[id] ?? id
}

export function navigateTo(id: string) {
  const resolved = resolveAnchor(id)
  history.replaceState(null, '', `#${resolved}`)
  scrollToSection(resolved)
}
