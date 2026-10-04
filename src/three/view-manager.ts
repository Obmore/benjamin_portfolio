import { hero3dWidthTier, isQa3d, isSoftwareGL, mark3dWatchdog } from '@/lib/three-gate'
import type { K1Scene } from './hero-k1'

type GsapTicker = {
  add: (fn: () => void) => void
  remove: (fn: () => void) => void
  deltaRatio: (fps?: number) => number
}

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

const SWAP_MS = 200
const PROBE_FRAMES = 12
const INTRO_MS = 700
const PULSE_MS = 1200
let hero: HeroMod | null = null
let renderer: InstanceType<HeroMod['WebGLRenderer']> | null = null
let canvas: HTMLCanvasElement | null = null
let boxEl: HTMLElement | null = null
let scene: InstanceType<HeroMod['Scene']> | null = null
let k1: K1Scene | null = null
let gen = 0
let progress = 0
let pulseU = 0
let pulseMax = 0
let entryTimer = 0
let entryStart = 0
let entryPhase: 'idle' | 'wait' | 'pulse' | 'done' = 'idle'
let rafCount = 0
let gsapTicker: GsapTicker | null = null
let tickerBound = false
let lastPainted = Number.NaN
let forcePaint = false
const PAINT_EPS = 1e-4
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
let bootSlowWorker: Worker | null = null
let scrollBound = false
let swapped = false
let swapTimer = 0
let disposing = false
let qaSync: (() => void) | null = null
let qaDetach: (() => void) | null = null
let lidHi = false

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
  const dpr = Math.max(1, window.devicePixelRatio || 1)
  return Math.min(dpr, lite ? 1.25 : 1.5)
}

// Adapted from mrdoob/three.js manual "Rendering on Demand" resizeRendererToDisplaySize
// https://threejs.org/manual/#en/rendering-on-demand
// Copyright (c) 2010-2026 three.js authors — SPDX: MIT
// Changes: cap pixelRatio at 1.5 (full) or 1.25 (lite), no rounding; keep baked 4:3 camera
function sizeCanvas() {
  if (!renderer || !canvas || !boxEl || !k1 || !hero) return
  const w = Math.max(1, boxEl.clientWidth)
  const h = Math.max(1, boxEl.clientHeight)
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  const pixelRatio = dprCap(k1.lite)
  renderer.setPixelRatio(pixelRatio)
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

function paint() {
  if (!renderer || !scene || !k1 || !hero) return
  renderer.info.reset()
  hero.applyK1Progress(k1, progress, pulseU)
  renderer.render(scene, k1.camera)
  const hi = progress > 0.5
  if (hi && !lidHi) {
    lidHi = true
    k1.mats.lid.opacity = 0.998
    k1.mats.lid.opacity = 0.999
    k1.mats.lid.needsUpdate = true
    renderer.render(scene, k1.camera)
  } else if (!hi) {
    lidHi = false
  }
  qaSync?.()
}

function cancelEntryPulse() {
  if (entryTimer) window.clearTimeout(entryTimer)
  entryTimer = 0
  if (entryPhase === 'wait' || entryPhase === 'pulse') entryPhase = 'done'
}

function startEntryPulse() {
  cancelEntryPulse()
  entryPhase = 'wait'
  pulseU = 0
  pulseMax = 0
  entryTimer = window.setTimeout(() => {
    entryTimer = 0
    entryPhase = 'pulse'
    entryStart = performance.now()
    requestRender(true)
  }, INTRO_MS)
}

function tickEntryPulse() {
  if (entryPhase !== 'pulse') return false
  const t = Math.min(1, (performance.now() - entryStart) / PULSE_MS)
  pulseU = t
  if (t > pulseMax) pulseMax = t
  if (t >= 1) {
    pulseMax = 1
    pulseU = 0
    entryPhase = 'done'
    forcePaint = true
    return false
  }
  return true
}

function watchdog(dt: number, work: number) {
  frameMs.push(work)
  const workLimit = k1?.lite ? 90 : 50
  const dtLimit = k1?.lite ? 220 : 90
  if (work > workLimit || dt > dtLimit) over50 += 1
  if (over50 >= 4) return true
  if (!k1?.lite && frameMs.length >= 12) {
    const sorted = [...frameMs].sort((a, b) => a - b)
    const mid = sorted[Math.floor((sorted.length - 1) / 2)]
    if (mid > 24) return true
  }
  return false
}

function downgradeToLite() {
  if (!k1 || k1.lite) return false
  k1.lite = true
  if (k1.subMesh) k1.subMesh.visible = false
  if (k1.carrier) k1.carrier.visible = false
  if (qa && boxEl) boxEl.dataset.hero3dTier = 'lite'
  sizeCanvas()
  frameMs.length = 0
  over50 = 0
  probeLeft = PROBE_FRAMES
  requestRender(true)
  return true
}

function stopTicker() {
  if (!tickerBound || !gsapTicker) return
  gsapTicker.remove(onTicker)
  tickerBound = false
}

async function ensureTicker() {
  if (gsapTicker) return gsapTicker
  const { default: gsap } = await import('gsap')
  gsapTicker = gsap.ticker
  return gsapTicker
}

// Adapted from mrdoob/three.js manual "Rendering on Demand" requestRenderIfNotRequested
// https://threejs.org/manual/#en/rendering-on-demand
// Copyright (c) 2010-2026 three.js authors — SPDX: MIT
// Changes: GSAP ticker instead of own rAF; paint at most once per tick and only if |p-lastP|>eps
function requestRender(force = false) {
  if (force) forcePaint = true
  if (!gsapTicker) {
    return
  }
  if (tickerBound) return
  tickerBound = true
  gsapTicker.add(onTicker)
}

function onTicker() {
  if (!renderer || disposing) {
    stopTicker()
    return
  }
  if (!visible && entryPhase !== 'pulse') {
    stopTicker()
    return
  }
  const pulsing = tickEntryPulse()
  const force = forcePaint || probeLeft > 0 || pulsing || entryPhase === 'pulse'
  forcePaint = false
  if (
    !force &&
    Number.isFinite(lastPainted) &&
    Math.abs(progress - lastPainted) <= PAINT_EPS
  ) {
    stopTicker()
    return
  }
  lastPainted = progress
  rafCount += 1
  const t0 = performance.now()
  paint()
  const work = performance.now() - t0
  const dt = (gsapTicker?.deltaRatio(60) ?? 1) * (1000 / 60)
  if (watchdog(dt, work)) {
    if (downgradeToLite()) return
    mark3dWatchdog()
    fallbackStatic()
    return
  }
  if (pulsing || probeLeft > 0) {
    if (probeLeft > 0) probeLeft -= 1
    if (pulsing || probeLeft > 0) {
      requestRender(true)
      return
    }
  }
  stopTicker()
}

function onProgress(p: number) {
  if (Math.abs(p - progress) <= PAINT_EPS) return
  cancelEntryPulse()
  progress = p
  pulseU = p
  requestRender()
}

function onVis() {
  if (document.hidden) {
    visible = false
    stopTicker()
    return
  }
  visible = true
  requestRender(true)
}

function onLost(event: Event) {
  event.preventDefault()
  disposing = true
  mark3dWatchdog()
  if (qa && boxEl) boxEl.dataset.hero3dTier = 'static'
  haltLoop()
  if (!boxEl) {
    teardownGpu()
    disposing = false
    return
  }
  const host = posterHost()
  if (host) {
    host.style.transitionDuration = '0ms'
    host.style.visibility = 'visible'
    host.style.opacity = '1'
  }
  boxEl.classList.remove('is-swapped', 'is-back')
  void boxEl.offsetWidth
  requestAnimationFrame(() => {
    teardownGpu()
    disposing = false
  })
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
  probeLeft = 0
  stopTicker()
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
  pulseU = 1
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

function stopBootSlow() {
  bootSlowWorker?.terminate()
  bootSlowWorker = null
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

async function attachQa() {
  if (!qa || qaDetach || !hero) return
  const mod = await import('./hero-qa')
  const bound = mod.attachHeroQa({
    Vector3: hero.Vector3,
    BoxGeometry: hero.BoxGeometry,
    MeshBasicMaterial: hero.MeshBasicMaterial,
    Mesh: hero.Mesh as never,
    getRoot: () => k1?.root ?? null,
    getCamera: () => k1?.camera ?? null,
    getK1: () => k1,
    getBox: () => canvas ?? boxEl,
    snapshotInfo,
    getRafCount: () => rafCount,
    getProgress: () => progress,
    getDpr: () => (renderer && canvas && boxEl ? canvas.width / Math.max(1, boxEl.clientWidth) : 1),
    getPixelRatio: () => renderer?.getPixelRatio() ?? 1,
    getTier: () => boxEl?.dataset.hero3dTier || (k1?.lite ? 'lite' : 'full'),
    getPulseU: () => pulseU,
    getPulseMax: () => pulseMax,
    seek(p: number) {
      cancelEntryPulse()
      progress = Math.min(1, Math.max(0, p))
      pulseU = progress
      paint()
    },
    dispose() {
      disposeHero()
    },
    paint,
    forceContextLoss() {
      renderer?.forceContextLoss()
    },
    shiftEnd(i: number, px: number) {
      if (!k1 || !hero) return
      const el = canvas ?? boxEl
      const width = Math.max(1, el?.clientWidth ?? 1)
      hero.shiftK1EndByPx(k1, i, px, width)
    },
  })
  qaSync = bound.sync
  qaDetach = bound.detach
}

function teardownGpu() {
  gen += 1
  booting = false
  stopBootSlow()
  haltLoop()
  clearSwapTimer()
  showPosterImmediate()
  qaDetach?.()
  qaDetach = null
  qaSync = null
  if (k1 && hero) hero.disposeK1(k1)
  k1 = null
  scene = null
  if (renderer) {
    renderer.domElement.removeEventListener('webglcontextlost', onLost, true)
    renderer.dispose()
    renderer.forceContextLoss()
  }
  renderer = null
  canvas?.remove()
  canvas = null
  if (window.__hero3d) window.__hero3d.info = snapshotInfo()
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
  if (watchdogOn() || (!qa && isSoftwareGL())) {
    if (qa) boxEl.dataset.hero3dTier = 'static'
    showPosterImmediate()
    return
  }
  booting = true
  const my = ++gen
  const tier = hero3dWidthTier()
  if (qa) boxEl.dataset.hero3dTier = tier

  const bootStart = performance.now()
  const bootTooSlow = () => performance.now() - bootStart > 6000
  let slowWorker: Worker | null = null
  try {
    const blob = new Blob([`setTimeout(() => postMessage(1), 8000)`], { type: 'text/javascript' })
    const url = URL.createObjectURL(blob)
    slowWorker = new Worker(url)
    URL.revokeObjectURL(url)
    bootSlowWorker = slowWorker
    slowWorker.onmessage = () => {
      if (my !== gen) return
      mark3dWatchdog()
      fallbackStatic()
    }
  } catch {
    /* blob workers may be blocked */
  }
  await nextFrame()
  if (aborted(my)) {
    booting = false
    return
  }
  await import('./three-core')
  await nextFrame()
  if (aborted(my) || bootTooSlow()) {
    if (bootTooSlow()) {
      mark3dWatchdog()
      fallbackStatic()
    }
    booting = false
    return
  }
  if (!hero) hero = await import('./hero-k1')
  await nextFrame()
  if (aborted(my) || bootTooSlow()) {
    if (!aborted(my) && bootTooSlow()) {
      mark3dWatchdog()
      fallbackStatic()
    }
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
      antialias: true,
      powerPreference: 'low-power',
      failIfMajorPerformanceCaveat: !qa,
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
      if (aborted(my) || bootTooSlow()) throw new Error('abort')
      await nextFrame()
    })
  } catch {
    if (my === gen) {
      if (bootTooSlow()) {
        mark3dWatchdog()
        fallbackStatic()
      } else {
        renderer?.dispose()
        canvas?.remove()
        renderer = null
        canvas = null
      }
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
  hero.applyK1Progress(k1, 1, 0)
  await compileQuiet(r, sc, k1.camera)
  k1.mats.lid.needsUpdate = true
  if (aborted(my) || bootTooSlow()) {
    if (!aborted(my) && bootTooSlow()) {
      mark3dWatchdog()
      fallbackStatic()
    }
    booting = false
    return
  }

  await nextFrame()
  if (aborted(my)) {
    booting = false
    return
  }

  progress = 0
  pulseU = 0
  pulseMax = 0
  lidHi = false
  frameMs.length = 0
  over50 = 0
  probeLeft = PROBE_FRAMES
  rafCount = 0
  lastPainted = Number.NaN
  swapped = false
  if (qa) await attachQa()
  if (aborted(my)) {
    booting = false
    return
  }
  await ensureTicker()
  if (aborted(my)) {
    booting = false
    return
  }
  paint()
  lastPainted = progress
  startPosterSwap()
  booting = false
  stopBootSlow()
  startEntryPulse()
  requestRender(true)
}

function setupObservers() {
  if (observersOn || !boxEl) return
  observersOn = true
  document.addEventListener('visibilitychange', onVis)
  themeMo = new MutationObserver(onTheme)
  themeMo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  ro = new ResizeObserver(() => {
    sizeCanvas()
    requestRender(true)
  })
  ro.observe(boxEl)
  io = new IntersectionObserver(
    (entries) => {
      const on = entries.some((e) => e.isIntersecting)
      visible = on
      if (!on) {
        stopTicker()
        if (!booting && renderer) teardownGpu()
        return
      }
      if (!renderer && !booting) {
        void bootScene()
        return
      }
      requestRender(true)
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
  delete window.__hero3d
  boxEl = null
  frameMs.length = 0
}
