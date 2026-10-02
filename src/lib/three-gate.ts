type NavMem = Navigator & {
  deviceMemory?: number
  connection?: { saveData?: boolean }
}

const WATCHDOG_KEY = 'ob-3d-off'

export type Hero3dTier = 'static' | 'lite' | 'full'

export function hasWebGL(): boolean {
  return typeof WebGLRenderingContext !== 'undefined'
}

export function hero3dWidthTier(): 'lite' | 'full' {
  if (window.matchMedia('(max-width: 1023px), (pointer: coarse)').matches) return 'lite'
  return 'full'
}

export function isQa3d(): boolean {
  return new URLSearchParams(location.search).get('qa3d') === '1'
}

export function mark3dWatchdog() {
  try {
    sessionStorage.setItem(WATCHDOG_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function hero3dTier(): Hero3dTier {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'static'
  const n = navigator as NavMem
  if (n.connection?.saveData) return 'static'
  if (typeof n.deviceMemory === 'number' && n.deviceMemory < 4) return 'static'
  try {
    if (sessionStorage.getItem(WATCHDOG_KEY)) return 'static'
  } catch {
    /* ignore */
  }
  if (!hasWebGL()) return 'static'
  return hero3dWidthTier()
}
