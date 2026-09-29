export type MotionProfile = 'full' | 'static'

declare global {
  interface Window {
    __MOTION_PROFILE__?: MotionProfile
  }
}

function readForcedProfile(): MotionProfile | null {
  if (typeof window === 'undefined') return null
  const forced = window.__MOTION_PROFILE__
  if (forced === 'full' || forced === 'static') return forced
  return null
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function isSlowPhone(): boolean {
  if (typeof window === 'undefined') return false
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean }
  }
  if (nav.connection?.saveData) return true
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const cores = navigator.hardwareConcurrency || 8
  return coarse && cores <= 4
}

export function shouldUseStaticMotion(): boolean {
  const forced = readForcedProfile()
  if (forced === 'full') return false
  if (forced === 'static') return true
  return prefersReducedMotion() || isSlowPhone()
}

export function desktopMotionQuery(): string {
  return '(min-width: 900px) and (prefers-reduced-motion: no-preference)'
}

export function mobileMotionQuery(): string {
  return '(max-width: 899px) and (prefers-reduced-motion: no-preference)'
}
