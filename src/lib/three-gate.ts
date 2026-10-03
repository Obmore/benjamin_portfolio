type NavMem = Navigator & {
  deviceMemory?: number
  connection?: { saveData?: boolean }
}

const WATCHDOG_KEY = 'ob-3d-off'

export type Hero3dTier = 'static' | 'lite' | 'full'

let cpuLite = false

export function markCpuLite() {
  cpuLite = true
}

export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    return Boolean(gl)
  } catch {
    return false
  }
}

export function cpuPrefersLite(): boolean {
  const t0 = performance.now()
  let n = 0
  let s = 0
  while (performance.now() - t0 < 8) {
    s = (s + n) | 0
    n += 1
  }
  void s
  return n < 120000
}

export function hero3dWidthTier(): 'lite' | 'full' {
  if (cpuLite) return 'lite'
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
