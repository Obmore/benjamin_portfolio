import { Color, Scene, WebGLRenderer } from 'three'
import { hero3dTier, isQa3d, mark3dWatchdog } from '@/lib/three-gate'
import {
  applyK1Progress,
  createK1Scene,
  disposeK1,
  layoutGrid,
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
  ends?: ReturnType<typeof projectEnds>
  seek?: (p: number) => void
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

function dprCap(lite: boolean) {
  const wide = window.innerWidth >= 1440
  return Math.min(window.devicePixelRatio || 1, lite ? 1.5 : wide ? 2 : 1.5)
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
  layoutGrid(k1, h, k1.frustum * 2)
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

function writeQa() {
  if (!qa || !k1 || !boxEl) return
  const w = boxEl.clientWidth
  const h = boxEl.clientHeight
  window.__hero3d = {
    tier: boxEl.dataset.hero3dTier || (k1.lite ? 'lite' : 'full'),
    info: snapshotInfo(),
    rafCount,
    progress,
    dpr: renderer ? canvas!.width / Math.max(1, boxEl.clientWidth) : 1,
    ends: projectEnds(k1, w, h, progress),
    seek(p: number) {
      progress = Math.min(1, Math.max(0, p))
      introOn = false
      paint()
    },
  }
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
  writeQa()
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
  paint()
}

function onLost(event: Event) {
  event.preventDefault()
  mark3dWatchdog()
  fallbackStatic()
}

function fallbackStatic() {
  if (qa && boxEl) boxEl.dataset.hero3dTier = 'static'
  stopView()
}

function onTheme() {
  if (!k1 || !boxEl) return
  setK1Colors(k1, readColors(boxEl))
  paint()
}

export async function startView(box: HTMLElement) {
  if (renderer) return
  const my = ++gen
  const tier = hero3dTier()
  if (tier === 'static') return
  qa = isQa3d()
  boxEl = box
  if (qa) box.dataset.hero3dTier = tier

  const el = document.createElement('canvas')
  el.setAttribute('aria-hidden', 'true')
  el.tabIndex = -1
  el.width = 2
  el.height = 2
  box.appendChild(el)
  canvas = el

  const lite = tier === 'lite'
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

  const built = createK1Scene(readColors(box), lite)
  if (my !== gen) {
    disposeK1(built)
    return
  }
  k1 = built
  const sc = new Scene()
  sc.add(k1.root)
  scene = sc
  sizeCanvas()

  try {
    if (r.compileAsync) await r.compileAsync(sc, k1.camera)
  } catch {
    /* compile best-effort */
  }
  if (my !== gen) return

  introT = 0
  introOn = true
  progress = 0
  frameMs.length = 0
  over50 = 0
  rafCount = 0
  stopScroll = attachHeroScroll(onProgress)
  paint()
  box.classList.add('is-ready')

  document.addEventListener('visibilitychange', onVis)
  themeMo = new MutationObserver(onTheme)
  themeMo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  ro = new ResizeObserver(() => {
    sizeCanvas()
    paint()
  })
  ro.observe(box)
  io = new IntersectionObserver(
    (entries) => {
      const on = entries.some((e) => e.isIntersecting)
      visible = on
      if (!on) {
        if (raf) cancelAnimationFrame(raf)
        raf = 0
        last = 0
        return
      }
      if (introOn) requestLoop()
      else paint()
    },
    { rootMargin: '0px' },
  )
  io.observe(box)
  requestLoop()
}

export function stopView() {
  gen += 1
  if (raf) cancelAnimationFrame(raf)
  raf = 0
  last = 0
  introOn = false
  stopScroll()
  stopScroll = () => {}
  document.removeEventListener('visibilitychange', onVis)
  themeMo?.disconnect()
  themeMo = null
  ro?.disconnect()
  ro = null
  io?.disconnect()
  io = null
  boxEl?.classList.remove('is-ready')
  if (qa && window.__hero3d) {
    window.__hero3d.info = snapshotInfo()
    window.__hero3d.rafCount = rafCount
  }
  if (k1) disposeK1(k1)
  k1 = null
  scene = null
  if (renderer) {
    renderer.domElement.removeEventListener('webglcontextlost', onLost, false)
    renderer.dispose()
    renderer.forceContextLoss()
  }
  renderer = null
  canvas?.remove()
  canvas = null
  boxEl = null
  if (qa) {
    const hook = window.__hero3d
    if (hook) {
      hook.info = {
        calls: 0,
        triangles: 0,
        geometries: 0,
        textures: 0,
        memory: { geometries: 0, textures: 0 },
      }
    }
  } else {
    delete window.__hero3d
  }
  frameMs.length = 0
}
