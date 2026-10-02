import { hero3dWidthTier, isQa3d, mark3dWatchdog } from '@/lib/three-gate'
import type { K1Scene } from './hero-k1'

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      const sched = (globalThis as unknown as { scheduler?: { yield?: () => Promise<void> } }).scheduler
      if (typeof sched?.yield === 'function') {
        void sched.yield().then(resolve)
        return
      }
      setTimeout(resolve, 0)
    })
  })
}

type HeroMod = typeof import('./hero-k1')
type Hero3dInfo = {
  calls: number
  triangles: number
  geometries: number
  textures: number
  memory: { geometries: number; textures: number }
}

type Hero3dQa = {
  tier: string
  layers: number
  info: Hero3dInfo
  rafCount: number
  progress: number
  dpr: number
  readonly ends: ReturnType<HeroMod['projectEnds']>
  seek?: (p: number) => void
  dispose?: () => void
  qaShiftEnd?: (index: number, dx: number, dy: number) => void
}

declare global {
  interface Window {
    __hero3d?: Hero3dQa
  }
}

const SWAP_MS = 200
const PROBE_FRAMES = 12
let hero: HeroMod | null = null
let renderer: InstanceType<HeroMod['WebGLRenderer']> | null = null
let canvas: HTMLCanvasElement | null = null
let boxEl: HTMLElement | null = null
let scene: InstanceType<HeroMod['Scene']> | null = null
let k1: K1Scene | null = null
let raf = 0
let gen = 0
let progress = 0
let last = 0
let rafCount = 0
const frameMs: number[] = []
let over50 = 0
let probeLeft = 0
let stopScroll = () => {}
let io: IntersectionObserver | null = null
let visible = true
let qa = false
let themeMo: MutationObserver | null = null
let ro: ResizeObserver | null = null
let observersOn = false
let booting = false
let scrollBound = false
let swapped = false
let swapTimer = 0
let disposing = false
const endShift: { dx: number; dy: number }[] = []

function aborted(my: number) {
  return my !== gen
}

function readColors(el: HTMLElement) {
  const Color = hero!.Color
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

function sizeCanvas() {
  if (!renderer || !canvas || !boxEl || !k1 || !hero) return
  const w = Math.max(1, boxEl.clientWidth)
  const h = Math.max(1, boxEl.clientHeight)
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  const lite = k1.lite
  renderer.setPixelRatio(dprCap(lite))
  renderer.setSize(w, h, false)
  hero.setK1Aspect(k1)
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
    layers: 3,
    info: snapshotInfo(),
    rafCount,
    progress,
    dpr: renderer && canvas ? canvas.width / Math.max(1, boxEl.clientWidth) : 1,
  }
  const existing = window.__hero3d
  if (existing) {
    existing.tier = next.tier
    existing.layers = next.layers
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
      paint()
    },
    dispose() {
      disposeHero()
    },
    qaShiftEnd(index: number, dx: number, dy: number) {
      const cur = endShift[index] ?? { dx: 0, dy: 0 }
      endShift[index] = { dx: cur.dx + dx, dy: cur.dy + dy }
    },
  } as Hero3dQa
  Object.defineProperty(hook, 'ends', {
    enumerable: true,
    configurable: true,
    get() {
      if (!k1 || !boxEl || !hero) return []
      const rows = hero.projectEnds(k1, boxEl.clientWidth, boxEl.clientHeight)
      return rows.map((row, i) => {
        const sh = endShift[i]
        if (!sh) return row
        return { ...row, x: row.x + sh.dx, y: row.y + sh.dy }
      })
    },
  })
  window.__hero3d = hook
}

function paint() {
  if (!renderer || !scene || !k1 || !hero) return
  renderer.info.reset()
  hero.applyK1Progress(k1, progress, progress)
  renderer.render(scene, k1.camera)
  bindQa()
}

function watchdog(dt: number, work: number) {
  frameMs.push(work)
  if (work > 50 || dt > 80) over50 += 1
  if (over50 >= 3) return true
  if (frameMs.length >= 12) {
    const sorted = [...frameMs].sort((a, b) => a - b)
    const mid = sorted[Math.floor((sorted.length - 1) / 2)]
    if (mid > 24) return true
  }
  return false
}

function tick(now: number) {
  raf = 0
  rafCount += 1
  const dt = last ? now - last : 16
  last = now
  const t0 = performance.now()
  paint()
  const work = performance.now() - t0
  if (watchdog(dt, work)) {
    mark3dWatchdog()
    fallbackStatic()
    return
  }
  if (probeLeft > 0) {
    probeLeft -= 1
    requestLoop()
  }
}

function requestLoop() {
  if (raf || !renderer || !visible) return
  raf = requestAnimationFrame(tick)
}

function onProgress(p: number) {
  progress = p
  last = 0
  paint()
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
}

function onLost(event: Event) {
  event.preventDefault()
  disposing = true
  mark3dWatchdog()
  if (qa && boxEl) boxEl.dataset.hero3dTier = 'static'
  showPosterImmediate()
  teardownGpu()
  disposing = false
}

function posterHost(): HTMLElement | null {
  return boxEl?.querySelector<HTMLElement>('.hero-3d-poster-host') ?? null
}

function clearSwapTimer() {
  if (swapTimer) window.clearTimeout(swapTimer)
  swapTimer = 0
}

function showPosterImmediate() {
  if (!boxEl) return
  clearSwapTimer()
  const host = posterHost()
  if (host) {
    host.style.transitionDuration = '0ms'
    host.style.visibility = 'visible'
    host.style.opacity = '1'
  }
  boxEl.classList.remove('is-ready', 'is-swapped', 'is-back')
  swapped = false
}

function haltLoop() {
  if (raf) cancelAnimationFrame(raf)
  raf = 0
  probeLeft = 0
  last = 0
  stopScroll()
  stopScroll = () => {}
  scrollBound = false
}

function disposeHero() {
  if (disposing) return
  disposing = true
  haltLoop()
  swapBackPoster(true, () => {
    teardownGpu()
    disposing = false
  })
}

function startPosterSwap() {
  if (!boxEl || !canvas) return
  clearSwapTimer()
  let done = false
  const finish = () => {
    if (done) return
    done = true
    canvas?.removeEventListener('transitionend', onEnd)
    if (!canvas || !boxEl || disposing) return
    boxEl.classList.add('is-swapped')
    swapped = true
    void bindScroll()
  }
  const onEnd = (event: TransitionEvent) => {
    if (event.propertyName !== 'opacity') return
    finish()
  }
  canvas.addEventListener('transitionend', onEnd)
  const host = posterHost()
  if (host) {
    host.style.transitionDuration = ''
    host.style.visibility = ''
    host.style.opacity = ''
  }
  boxEl.classList.remove('is-back', 'is-swapped')
  boxEl.classList.add('is-ready')
  swapTimer = window.setTimeout(finish, SWAP_MS + 120)
}

function swapBackPoster(animated: boolean, after: () => void) {
  if (!boxEl) {
    after()
    return
  }
  if (!animated || !swapped) {
    showPosterImmediate()
    after()
    return
  }
  clearSwapTimer()
  progress = 1
  paint()
  let done = false
  const host = posterHost()
  const finish = () => {
    if (done) return
    done = true
    host?.removeEventListener('transitionend', onEnd)
    showPosterImmediate()
    after()
  }
  const onEnd = (event: TransitionEvent) => {
    if (event.propertyName !== 'opacity') return
    finish()
  }
  host?.addEventListener('transitionend', onEnd)
  boxEl.classList.remove('is-swapped')
  boxEl.classList.add('is-back')
  swapTimer = window.setTimeout(finish, SWAP_MS + 120)
}

function fallbackStatic() {
  if (qa && boxEl) boxEl.dataset.hero3dTier = 'static'
  disposeHero()
}

function onTheme() {
  if (!k1 || !boxEl || !hero) return
  hero.setK1Colors(k1, readColors(boxEl), isDark())
  paint()
}

async function compileQuiet(
  r: InstanceType<HeroMod['WebGLRenderer']>,
  sc: InstanceType<HeroMod['Scene']>,
  cam: K1Scene['camera'],
) {
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
  haltLoop()
  clearSwapTimer()
  showPosterImmediate()
  if (k1 && hero) hero.disposeK1(k1)
  k1 = null
  scene = null
  if (qa && window.__hero3d && renderer) {
    window.__hero3d.info = snapshotInfo()
    window.__hero3d.rafCount = rafCount
  }
  if (renderer) {
    renderer.domElement.removeEventListener('webglcontextlost', onLost, true)
    renderer.dispose()
    renderer.forceContextLoss()
  }
  renderer = null
  canvas?.remove()
  canvas = null
}

async function bindScroll() {
  if (scrollBound || disposing) return
  scrollBound = true
  await nextFrame()
  if (disposing || !renderer || !boxEl) {
    scrollBound = false
    return
  }
  const { attachHeroScroll } = await import('./hero-scroll')
  if (disposing || !renderer || !boxEl) {
    scrollBound = false
    return
  }
  stopScroll = attachHeroScroll(onProgress, { skipInitial: true })
}

function watchdogOn() {
  try {
    return sessionStorage.getItem('ob-3d-off') === '1'
  } catch {
    return false
  }
}

async function bootScene() {
  if (renderer || booting || disposing || !boxEl) return
  if (watchdogOn()) {
    if (qa) boxEl.dataset.hero3dTier = 'static'
    showPosterImmediate()
    return
  }
  booting = true
  const my = ++gen
  const tier = hero3dWidthTier()
  if (qa) boxEl.dataset.hero3dTier = tier

  await nextFrame()
  if (aborted(my)) {
    booting = false
    return
  }
  await import('./three-core')
  await nextFrame()
  if (aborted(my)) {
    booting = false
    return
  }
  if (!hero) hero = await import('./hero-k1')
  await nextFrame()
  if (aborted(my)) {
    booting = false
    return
  }

  const el = document.createElement('canvas')
  el.setAttribute('aria-hidden', 'true')
  el.tabIndex = -1
  el.width = 2
  el.height = 2
  boxEl.appendChild(el)
  canvas = el
  if (qa) el.setAttribute('data-pose', '0')

  const lite = tier === 'lite'
  await nextFrame()
  if (aborted(my)) {
    booting = false
    return
  }

  let r: InstanceType<HeroMod['WebGLRenderer']>
  try {
    r = new hero.WebGLRenderer({
      canvas: el,
      alpha: true,
      antialias: !lite,
      powerPreference: 'low-power',
      failIfMajorPerformanceCaveat: false,
    })
  } catch {
    el.remove()
    canvas = null
    if (qa) boxEl.dataset.hero3dTier = 'static'
    booting = false
    return
  }
  r.setClearColor(0x000000, 0)
  r.setPixelRatio(dprCap(lite))
  r.autoClear = true
  renderer = r
  r.domElement.addEventListener('webglcontextlost', onLost, true)

  await nextFrame()
  if (aborted(my)) {
    booting = false
    return
  }

  let built: K1Scene
  try {
    built = await hero.createK1Scene(readColors(boxEl), lite, async () => {
      if (aborted(my)) throw new Error('abort')
      await nextFrame()
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
  if (aborted(my)) {
    hero.disposeK1(built)
    booting = false
    return
  }

  await nextFrame()
  if (aborted(my)) {
    hero.disposeK1(built)
    booting = false
    return
  }
  hero.setK1Colors(built, readColors(boxEl), isDark())
  k1 = built
  const sc = new hero.Scene()
  sc.add(k1.root)
  scene = sc

  await nextFrame()
  if (aborted(my)) {
    booting = false
    return
  }
  sizeCanvas()

  await nextFrame()
  if (aborted(my)) {
    booting = false
    return
  }
  await compileQuiet(r, sc, k1.camera)

  await nextFrame()
  if (aborted(my)) {
    booting = false
    return
  }

  progress = 1
  frameMs.length = 0
  over50 = 0
  probeLeft = PROBE_FRAMES
  rafCount = 0
  last = 0
  endShift.length = 0
  swapped = false
  paint()
  startPosterSwap()
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
      paint()
    },
    { rootMargin: '0px' },
  )
  io.observe(boxEl)
}

export async function startView(box: HTMLElement) {
  if (renderer) return
  qa = isQa3d()
  boxEl = box
  setupObservers()
  await bootScene()
}

export function stopView() {
  stopScroll()
  stopScroll = () => {}
  scrollBound = false
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
