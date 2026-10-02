import { afterLcpAndIdle, nextFrame } from '@/lib/after-lcp'

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

  void (async () => {
    await afterLcpAndIdle()
    if (stopped) return
    if (mediaStatic()) {
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
    const mod = await import('@/three/view-manager')
    await nextFrame()
    if (stopped) return
    await mod.startView(box)
    stopView = () => mod.stopView()
    writeTier(widthTier())
  })()

  return () => {
    stopped = true
    stopView()
  }
}
