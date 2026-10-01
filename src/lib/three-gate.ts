const WATCHDOG_KEY = 'ob-3d-off'

function navExt() {
  return navigator as Navigator & {
    deviceMemory?: number
    connection?: { saveData?: boolean }
  }
}

function qaForce(): boolean {
  if (!__3D_QA__) return false
  const v = new URLSearchParams(location.search).get('3d')
  return v === 'force'
}

export function isLite3dViewport(): boolean {
  return window.matchMedia('(max-width: 1023px), (pointer: coarse)').matches
}

export function isStatic3dProfile(): boolean {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true
  const n = navExt()
  if (n.connection?.saveData) return true
  if (typeof n.deviceMemory === 'number' && n.deviceMemory <= 2) return true
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) return true
  try {
    if (sessionStorage.getItem(WATCHDOG_KEY)) return true
  } catch {
    /* ignore */
  }
  return false
}

/** C never starts a three download on phones / coarse pointers / weak devices. */
export function canLoad3dEngine(): boolean {
  if (qaForce()) return true
  if (isStatic3dProfile()) return false
  if (isLite3dViewport()) return false
  return true
}

export function mark3dWatchdog() {
  try {
    sessionStorage.setItem(WATCHDOG_KEY, '1')
  } catch {
    /* ignore */
  }
}
