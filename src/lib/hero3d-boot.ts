type NavMem = Navigator & {
  deviceMemory?: number
  connection?: { saveData?: boolean }
}

const WATCHDOG_KEY = 'ob-3d-off'

function hasWebGL(): boolean {
  try {
    const el = document.createElement('canvas')
    const ok = Boolean(el.getContext('webgl2') || el.getContext('webgl'))
    el.remove()
    return ok
  } catch {
    return false
  }
}

function isQa3d(): boolean {
  return new URLSearchParams(location.search).get('qa3d') === '1'
}

function tier(): 'static' | 'lite' | 'full' {
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
  if (window.matchMedia('(max-width: 1023px), (pointer: coarse)').matches) return 'lite'
  return 'full'
}

function afterLoad(): Promise<void> {
  if (document.readyState === 'complete') return Promise.resolve()
  return new Promise((resolve) => {
    window.addEventListener('load', () => resolve(), { once: true })
  })
}

function afterIdle(): Promise<void> {
  return new Promise((resolve) => {
    const ric = window.requestIdleCallback
    if (typeof ric === 'function') ric(() => resolve(), { timeout: 2000 })
    else window.setTimeout(resolve, 200)
  })
}

function nearBox(el: Element): Promise<void> {
  return new Promise((resolve) => {
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect()
          resolve()
        }
      },
      { rootMargin: '200px 0px' },
    )
    io.observe(el)
  })
}

function yieldMain(): Promise<void> {
  const sched = (globalThis as unknown as { scheduler?: { yield?: () => Promise<void> } }).scheduler
  if (typeof sched?.yield === 'function') return sched.yield()
  return new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}

export function bootHero3d(): () => void {
  const box = document.querySelector<HTMLElement>('.hero-3d')
  const qa = isQa3d()
  const writeTier = (value: ReturnType<typeof tier>) => {
    if (qa && box) box.dataset.hero3dTier = value
  }

  writeTier(tier())
  if (!box || tier() === 'static') return () => {}

  let stopped = false
  let stopView = () => {}

  void (async () => {
    await afterLoad()
    await afterIdle()
    if (stopped) return
    await nearBox(box)
    if (stopped || tier() === 'static') {
      writeTier(tier())
      return
    }
    const mod = await import('@/three/view-manager')
    await yieldMain()
    if (stopped) return
    await mod.startView(box)
    stopView = () => mod.stopView()
    writeTier(tier())
  })()

  return () => {
    stopped = true
    stopView()
  }
}
