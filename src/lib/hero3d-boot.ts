import { hero3dTier, isQa3d } from '@/lib/three-gate'

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

export function bootHero3d(): () => void {
  const box = document.querySelector<HTMLElement>('.hero-3d')
  const qa = isQa3d()
  const writeTier = (tier: ReturnType<typeof hero3dTier>) => {
    if (qa && box) box.dataset.hero3dTier = tier
  }

  writeTier(hero3dTier())
  if (!box || hero3dTier() === 'static') return () => {}

  let stopped = false
  let stopView = () => {}

  void (async () => {
    await afterLoad()
    if (!qa) await afterIdle()
    if (stopped) return
    await nearBox(box)
    if (stopped || hero3dTier() === 'static') {
      writeTier(hero3dTier())
      return
    }
    const mod = await import('@/three/view-manager')
    if (stopped) return
    await mod.startView(box)
    stopView = () => mod.stopView()
    writeTier(hero3dTier())
  })()

  return () => {
    stopped = true
    stopView()
  }
}
