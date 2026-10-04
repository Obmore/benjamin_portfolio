import { afterLcp, afterIdle, nextFrame } from '@/lib/after-lcp'
import {
  hasWebGL,
  hero3dWidthTier,
  isQa3d,
  isSoftwareGL,
  mark3dWatchdog,
} from '@/lib/three-gate'

type NavMem = Navigator & {
  deviceMemory?: number
  connection?: { saveData?: boolean }
}

const WATCHDOG_KEY = 'ob-3d-off'

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

function tripWatchdog() {
  mark3dWatchdog()
}

function yieldTick(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 0)
  })
}

// CDP CPU throttle slows JS work, not setTimeout. Six short loops stay
// under a long-task at 4× (~80–100 ms total) and trip past 150 ms at 20×.
async function qaCpuSlow(): Promise<boolean> {
  const t0 = performance.now()
  let n = 0
  for (let round = 0; round < 6; round++) {
    for (let i = 0; i < 5e5; i++) n = (n + i) | 0
    if (performance.now() - t0 > 150) return n !== -1
    await yieldTick()
  }
  return performance.now() - t0 > 150 && n !== -1
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

  if (!hasWebGL() || (!qa && isSoftwareGL())) {
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
  const deadline = qa ? 0 : window.setTimeout(fireDeadline, 20000)
  if (!qa) {
    try {
      const blob = new Blob([`setTimeout(() => postMessage(1), 25000)`], { type: 'text/javascript' })
      const url = URL.createObjectURL(blob)
      deadlineWorker = new Worker(url)
      URL.revokeObjectURL(url)
      deadlineWorker.onmessage = () => fireDeadline()
    } catch {
      /* blob workers may be blocked; the window timer remains */
    }
  }

  const clearDeadline = () => {
    window.clearTimeout(deadline)
    deadlineWorker?.terminate()
    deadlineWorker = null
  }

  void (async () => {
    if (qa && (await qaCpuSlow())) {
      fireDeadline()
      return
    }
    await afterLcp()
    await nextFrame()
    if (stopped) return
    if (mediaStatic() || !hasWebGL() || (!qa && isSoftwareGL())) {
      writeTier('static')
      clearDeadline()
      return
    }
    if (!qa) await afterIdle()
    if (stopped || mediaStatic() || !hasWebGL() || (!qa && isSoftwareGL())) {
      writeTier('static')
      clearDeadline()
      return
    }
    await nextFrame()
    if (stopped) return
    writeTier(hero3dWidthTier())
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
    if (stopped || mediaStatic() || (!qa && isSoftwareGL())) {
      writeTier(mediaStatic() || (!qa && isSoftwareGL()) ? 'static' : hero3dWidthTier())
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
    writeTier(hero3dWidthTier())
  })()

  return () => {
    stopped = true
    clearDeadline()
    stopView()
  }
}
