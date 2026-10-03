import { afterLcp, afterIdle, importHeroView, nextFrame } from '@/lib/after-lcp'

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

async function cpuTooSlow() {
  let busy = 0
  let s = 0
  const total = 1_000_000
  const chunk = 50_000
  for (let i = 0; i < total; i += chunk) {
    const end = Math.min(total, i + chunk)
    const t0 = performance.now()
    for (let j = i; j < end; j += 1) s = (s + j) | 0
    busy += performance.now() - t0
    if (busy > 90) {
      void s
      return true
    }
    await nextFrame()
  }
  void s
  return false
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
  const deadline = window.setTimeout(() => {
    if (stopped) return
    tripWatchdog()
    writeTier('static')
    stopped = true
    stopView()
  }, 9000)

  void (async () => {
    await afterLcp()
    await nextFrame()
    if (stopped) return
    if (mediaStatic()) {
      writeTier('static')
      return
    }
    if (await cpuTooSlow()) {
      tripWatchdog()
      writeTier('static')
      return
    }
    if (!qa) await afterIdle()
    if (stopped || mediaStatic()) {
      writeTier('static')
      return
    }
    await nextFrame()
    if (stopped) return
    if (!canWebGL()) {
      writeTier('static')
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
      return
    }
    await nextFrame()
    if (stopped) return
    const mod = await importHeroView()
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
    window.clearTimeout(deadline)
    writeTier(widthTier())
  })()

  return () => {
    stopped = true
    window.clearTimeout(deadline)
    stopView()
  }
}
