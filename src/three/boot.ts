import { canLoad3dEngine } from '@/lib/three-gate'

type BootApi = typeof import('./view-manager')

let alive = false
let api: BootApi | null = null
let media: MediaQueryList | null = null

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

function nearBox(): Promise<void> {
  const boxes = [...document.querySelectorAll<HTMLElement>('[data-scene3d]')]
  if (boxes.length === 0) return Promise.resolve()
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
    for (const box of boxes) io.observe(box)
  })
}

function stillAllowed(): boolean {
  return alive && canLoad3dEngine() && hasWebGL()
}

async function loadEngine(): Promise<BootApi | null> {
  await afterLoad()
  await afterIdle()
  await nearBox()
  if (!stillAllowed()) return null
  const mod = await import('./view-manager')
  return mod
}

function onMedia() {
  if (!stillAllowed()) {
    api?.stopView()
  }
}

export function boot3d() {
  if (alive) return
  alive = true
  media = window.matchMedia('(max-width: 1023px), (pointer: coarse), (prefers-reduced-motion: reduce)')
  media.addEventListener('change', onMedia)
  void loadEngine().then((mod) => {
    api = mod
    if (mod && stillAllowed()) void mod.startView()
    else mod?.stopView()
  })
}

export function stop3d() {
  alive = false
  media?.removeEventListener('change', onMedia)
  media = null
  api?.stopView()
  api = null
}
