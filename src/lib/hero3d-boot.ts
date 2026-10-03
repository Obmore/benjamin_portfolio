import { afterLcp, afterIdle, nextFrame } from '@/lib/after-lcp'

type NavMem = Navigator & {
  deviceMemory?: number
  connection?: { saveData?: boolean }
}

const WATCHDOG_KEY = 'ob-3d-off'

function canWebGL(): boolean {
  return typeof WebGLRenderingContext !== 'undefined'
}

function isQa3d(): boolean {
  return new URLSearchParams(location.search).get('qa3d') === '1'
}

function mediaStatic(): boolean {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true
  const n = navigator as NavMem
  if (n.connection?.saveData) return true
  if (typeof n.deviceMemory === 'number' && n.deviceMemory < 4) return true
  try {
    if (sessionStorage.getItem(WATCHDOG_KEY)) return true
  } catch {
    /* ignore */
  }
  return false
}

function widthTier(): 'lite' | 'full' {
  if (window.matchMedia('(max-width: 1023px), (pointer: coarse)').matches) return 'lite'
  return 'full'
}

function tripWatchdog() {
  try {
    sessionStorage.setItem(WATCHDOG_KEY, '1')
  } catch {
    /* ignore */
  }
}

function cpuTooSlow() {
  const t0 = performance.now()
  let n = 0
  let s = 0
  while (performance.now() - t0 < 8) {
    s = (s + n) | 0
    n += 1
  }
  void s
  return n < 4000
}

export function bootHero3d(): () => void {
  const box = document.querySelector<HTMLElement>('.hero-3d')
  const qa = isQa3d()
  const writeTier = (value: 'static' | 'lite' | 'full') => {
    if (qa && box) box.dataset.hero3dTier = value
  }

  if (!box || mediaStatic()) {
    writeTier('static')
    return () => {}
  }

  let stopped = false
  let stopView = () => {}
  let deadlineWorker: Worker | null = null
  const fireDeadline = () => {
    if (stopped) return
    tripWatchdog()
    writeTier('static')
    stopped = true
    stopView()
  }
  const deadline = window.setTimeout(fireDeadline, 9000)
  try {
    const blob = new Blob([`setTimeout(() => postMessage(1), 12000)`], { type: 'text/javascript' })
    const url = URL.createObjectURL(blob)
    deadlineWorker = new Worker(url)
    URL.revokeObjectURL(url)
    deadlineWorker.onmessage = () => fireDeadline()
  } catch {
    /* blob workers may be blocked; the window timer remains */
  }

  const clearDeadline = () => {
    window.clearTimeout(deadline)
    deadlineWorker?.terminate()
    deadlineWorker = null
  }

  void (async () => {
    await afterLcp()
    await nextFrame()
    if (stopped) return
    if (mediaStatic()) {
      writeTier('static')
      clearDeadline()
      return
    }
    if (cpuTooSlow()) {
      fireDeadline()
      clearDeadline()
      return
    }
    if (!qa) await afterIdle()
    if (stopped || mediaStatic()) {
      writeTier('static')
      clearDeadline()
      return
    }
    await nextFrame()
    if (stopped) return
    if (!canWebGL()) {
      writeTier('static')
      clearDeadline()
      return
    }
    writeTier(widthTier())
    const near = new Promise<void>((resolve) => {
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            io.disconnect()
            resolve()
          }
        },
        { rootMargin: '200px 0px' },
      )
      io.observe(box)
    })
    await near
    if (stopped || mediaStatic()) {
      writeTier(mediaStatic() ? 'static' : widthTier())
      if (!stopped) clearDeadline()
      return
    }
    await nextFrame()
    if (stopped) return
    const mod = await import('@/three/view-manager')
    stopView = () => mod.stopView()
    await nextFrame()
    if (stopped) {
      mod.stopView()
      return
    }
    await mod.startView(box)
    if (stopped) {
      mod.stopView()
      return
    }
    clearDeadline()
    writeTier(widthTier())
  })()

  return () => {
    stopped = true
    clearDeadline()
    stopView()
  }
}
