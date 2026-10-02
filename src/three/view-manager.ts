import { Color, Scene, WebGLRenderer } from 'three'
import { hero3dTier, isQa3d, mark3dWatchdog } from '@/lib/three-gate'
import {
  applyK1Progress,
  createK1Scene,
  disposeK1,
  projectEnds,
  setK1Aspect,
  setK1Colors,
  type K1Scene,
} from './hero-k1'
import { attachHeroScroll } from './hero-scroll'

type Hero3dInfo = {
  calls: number
  triangles: number
  geometries: number
  textures: number
  memory: { geometries: number; textures: number }
}

type Hero3dQa = {
  tier: string
  info: Hero3dInfo
  rafCount: number
  progress: number
  dpr: number
  readonly ends: ReturnType<typeof projectEnds>
  seek?: (p: number) => void
  dispose?: () => void
}

declare global {
  interface Window {
    __hero3d?: Hero3dQa
  }
}

const INTRO_MS = 1100
let renderer: WebGLRenderer | null = null
let canvas: HTMLCanvasElement | null = null
let boxEl: HTMLElement | null = null
let scene: Scene | null = null
let k1: K1Scene | null = null
let raf = 0
let gen = 0
let progress = 0
let introT = 0
let introOn = true
let last = 0
let rafCount = 0
const frameMs: number[] = []
let over50 = 0
let stopScroll = () => {}
let io: IntersectionObserver | null = null
let visible = true
let qa = false
let themeMo: MutationObserver | null = null
let ro: ResizeObserver | null = null
let observersOn = false
let booting = false

function readColors(el: HTMLElement) {
  const css = getComputedStyle(el)
  const tok = (name: string, fb: string) => css.getPropertyValue(name).trim() || fb
  return {
    surface: new Color(tok('--color-surface', '#ffffff')),
    ink: new Color(tok('--color-ink', tok('--color-foreground', '#0f172a'))),
    accent: new Color(tok('--color-accent', '#1e3a5f')),
    line: new Color(tok('--color-line', '#d7e2ef')),
  }
}

function isDark() {
  return document.documentElement.getAttribute('data-theme') === 'dark'
}

function dprCap(lite: boolean) {
  const wide = window.innerWidth >= 1440
  return Math.min(window.devicePixelRatio || 1, lite ? 1.5 : wide ? 2 : 1.5)
}

function yieldSlice() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      const ric = window.requestIdleCallback
      if (typeof ric === 'function') ric(() => resolve(), { timeout: 16 })
      else window.setTimeout(resolve, 0)
    })
  })
}

function sizeCanvas() {
  if (!renderer || !canvas || !boxEl || !k1) return
  const w = Math.max(1, boxEl.clientWidth)
  const h = Math.max(1, boxEl.clientHeight)
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  const lite = k1.lite
  renderer.setPixelRatio(dprCap(lite))
  renderer.setSize(w, h, false)
  setK1Aspect(k1, w / h)
}

function snapshotInfo(): Hero3dInfo {
  const info = renderer?.info
  const memory = info?.memory ?? { geometries: 0, textures: 0 }
  const render = info?.render
  return {
    calls: render?.calls ?? 0,
    triangles: render?.triangles ?? 0,
    geometries: memory.geometries,
    textures: memory.textures,
    memory: { geometries: memory.geometries, textures: memory.textures },
  }
}

function bindQa() {
  if (!qa || !boxEl) return
  const next = {
    tier: boxEl.dataset.hero3dTier || (k1?.lite ? 'lite' : 'full'),
    info: snapshotInfo(),
    rafCount,
    progress,
    dpr: renderer && canvas ? canvas.width / Math.max(1, boxEl.clientWidth) : 1,
  }
  const existing = window.__hero3d
  if (existing) {
    existing.tier = next.tier
    existing.info = next.info
    existing.rafCount = next.rafCount
    existing.progress = next.progress
    existing.dpr = next.dpr
    return
  }
  const hook = {
    ...next,
    seek(p: number) {
      progress = Math.min(1, Math.max(0, p))
      introOn = false
      paint()
    },
    dispose() {
      teardownGpu()
    },
  } as Hero3dQa
  Object.defineProperty(hook, 'ends', {
    enumerable: true,
    configurable: true,
    get() {
      if (!k1 || !boxEl) return []
      return projectEnds(k1, boxEl.clientWidth, boxEl.clientHeight)
    },
  })
  window.__hero3d = hook
}

function pulseU() {
  if (introOn) return Math.min(1, introT / INTRO_MS)
  return progress
}

function paint() {
  if (!renderer || !scene || !k1) return
  renderer.info.reset()
  applyK1Progress(k1, progress, pulseU())
  renderer.render(scene, k1.camera)
  bindQa()
}

function watchdog(dt: number) {
  frameMs.push(dt)
  if (dt > 50) over50 += 1
  if (over50 >= 3) return true
  if (frameMs.length >= 60) {
    const sorted = [...frameMs].sort((a, b) => a - b)
    const mid = (sorted[29] + sorted[30]) / 2
    if (mid > 24) return true
  }
  return false
}

function tick(now: number) {
  raf = 0
  rafCount += 1
  const dt = last ? now - last : 16
  last = now
  if (watchdog(dt)) {
    mark3dWatchdog()
    fallbackStatic()
    return
  }
  if (introOn) {
    introT += dt
    if (introT >= INTRO_MS) introOn = false
  }
  paint()
  if (introOn) requestLoop()
}

function requestLoop() {
  if (raf || !renderer || !visible) return
  last = 0
  raf = requestAnimationFrame(tick)
}

function onProgress(p: number) {
  progress = p
  if (!introOn) requestLoop()
}

function onVis() {
  if (document.hidden) {
    visible = false
    if (raf) cancelAnimationFrame(raf)
    raf = 0
    last = 0
    return
  }
  visible = true
  last = 0
  paint()
  if (introOn) requestLoop()
}

function onLost(event: Event) {
  event.preventDefault()
  mark3dWatchdog()
  fallbackStatic()
}

function fallbackStatic() {
  if (qa && boxEl) boxEl.dataset.hero3dTier = 'static'
  teardownGpu()
}

function onTheme() {
  if (!k1 || !boxEl) return
  setK1Colors(k1, readColors(boxEl), isDark())
  paint()
}

async function compileQuiet(r: WebGLRenderer, sc: Scene, cam: K1Scene['camera']) {
  const warn = console.warn
  console.warn = (...args: unknown[]) => {
    if (String(args[0] ?? '').includes('KHR_parallel_shader_compile')) return
    warn(...(args as Parameters<typeof console.warn>))
  }
  try {
    await r.compileAsync(sc, cam)
  } catch {
    r.compile(sc, cam)
  } finally {
    console.warn = warn
  }
}

function teardownGpu() {
  gen += 1
  booting = false
  if (raf) cancelAnimationFrame(raf)
  raf = 0
  last = 0
  introOn = false
  boxEl?.classList.remove('is-ready')
  if (k1) disposeK1(k1)
  k1 = null
  scene = null
  if (qa && window.__hero3d && renderer) {
    window.__hero3d.info = snapshotInfo()
    window.__hero3d.rafCount = rafCount
  }
  if (renderer) {
    renderer.domElement.removeEventListener('webglcontextlost', onLost, false)
    renderer.dispose()
    renderer.forceContextLoss()
  }
  renderer = null
  canvas?.remove()
  canvas = null
}

async function bootScene() {
  if (renderer || booting || !boxEl) return
  booting = true
  const my = ++gen
  const tier = hero3dTier()
  if (tier === 'static') {
    booting = false
    return
  }
  if (qa) boxEl.dataset.hero3dTier = tier

  const el = document.createElement('canvas')
  el.setAttribute('aria-hidden', 'true')
  el.tabIndex = -1
  el.width = 2
  el.height = 2
  boxEl.appendChild(el)
  canvas = el
  if (qa) el.setAttribute('data-pose', '0')

  const lite = tier === 'lite'
  await yieldSlice()
  if (my !== gen) {
    booting = false
    return
  }
  const r = new WebGLRenderer({
    canvas: el,
    alpha: true,
    antialias: !lite,
    powerPreference: 'low-power',
  })
  r.setClearColor(0x000000, 0)
  r.setPixelRatio(dprCap(lite))
  r.autoClear = true
  renderer = r
  r.domElement.addEventListener('webglcontextlost', onLost, false)

  let built: K1Scene
  try {
    built = await createK1Scene(readColors(boxEl), lite, async () => {
      if (my !== gen) throw new Error('abort')
      await yieldSlice()
    })
  } catch {
    if (my === gen) {
      renderer?.dispose()
      canvas?.remove()
      renderer = null
      canvas = null
    }
    booting = false
    return
  }
  if (my !== gen) {
    disposeK1(built)
    booting = false
    return
  }
  setK1Colors(built, readColors(boxEl), isDark())
  k1 = built
  const sc = new Scene()
  sc.add(k1.root)
  scene = sc
  sizeCanvas()

  await yieldSlice()
  if (my !== gen) {
    booting = false
    return
  }
  await compileQuiet(r, sc, k1.camera)
  if (my !== gen) {
    booting = false
    return
  }

  introT = 0
  introOn = true
  frameMs.length = 0
  over50 = 0
  rafCount = 0
  last = 0
  paint()
  boxEl.classList.add('is-ready')
  booting = false
  requestLoop()
}

function setupObservers() {
  if (observersOn || !boxEl) return
  observersOn = true
  document.addEventListener('visibilitychange', onVis)
  themeMo = new MutationObserver(onTheme)
  themeMo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  ro = new ResizeObserver(() => {
    sizeCanvas()
    paint()
  })
  ro.observe(boxEl)
  io = new IntersectionObserver(
    (entries) => {
      const on = entries.some((e) => e.isIntersecting)
      visible = on
      if (!on) {
        if (raf) cancelAnimationFrame(raf)
        raf = 0
        last = 0
        teardownGpu()
        return
      }
      if (!renderer) {
        void bootScene()
        return
      }
      last = 0
      if (introOn) requestLoop()
      else paint()
    },
    { rootMargin: '0px' },
  )
  io.observe(boxEl)
}

export async function startView(box: HTMLElement) {
  if (renderer) return
  qa = isQa3d()
  boxEl = box
  if (qa) box.dataset.hero3dTier = hero3dTier()
  stopScroll = attachHeroScroll(onProgress)
  setupObservers()
  await bootScene()
}

export function stopView() {
  stopScroll()
  stopScroll = () => {}
  document.removeEventListener('visibilitychange', onVis)
  themeMo?.disconnect()
  themeMo = null
  ro?.disconnect()
  ro = null
  io?.disconnect()
  io = null
  observersOn = false
  teardownGpu()
  if (!qa) delete window.__hero3d
  boxEl = null
  frameMs.length = 0
}
