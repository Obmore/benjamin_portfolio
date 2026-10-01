import { ANCHOR_ALIASES } from '@/lib/constants'

export const FORBIDDEN_HASH_IDS = new Set(['root', 'top'])

export function resolveAnchor(hash: string): string {
  const id = hash.replace(/^#/, '')
  if (!id) return id
  return ANCHOR_ALIASES[id] ?? id
}

export function locationWithoutHash() {
  return `${window.location.pathname}${window.location.search}`
}

export function replaceLocationHash(id: string | null) {
  const next = id ? `${locationWithoutHash()}#${id}` : locationWithoutHash()
  const displayed = `${locationWithoutHash()}${
    window.location.hash || (/#$/.test(window.location.href) ? '#' : '')
  }`
  if (displayed === next) return
  history.replaceState(null, '', next)
}

export function rawLocationHash() {
  const { hash } = window.location
  if (!hash || hash === '#') return ''
  try {
    return decodeURIComponent(hash.slice(1))
  } catch {
    return hash.slice(1)
  }
}

export function stripJunkHash() {
  const { hash, href } = window.location
  const raw = rawLocationHash()
  const bareHash = hash === '#' || (!raw && /#$/.test(href))
  if (bareHash || FORBIDDEN_HASH_IDS.has(raw)) {
    replaceLocationHash(null)
    return ''
  }
  return raw
}

export function isHashTargetInView(id: string, headerOffsetPx = 64) {
  const element = document.getElementById(id)
  if (!element) return false
  const rect = element.getBoundingClientRect()
  return rect.bottom > headerOffsetPx && rect.top < window.innerHeight
}
