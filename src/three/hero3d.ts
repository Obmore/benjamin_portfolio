import {
  Color,
  LineBasicMaterial,
  MeshBasicMaterial,
  OrthographicCamera,
  Scene,
  WebGLRenderer,
  type Object3D,
  type WebGLRendererParameters,
} from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { attachHeroScroll } from '@/three/hero-scroll'
import { BOT_Y, FRUSTUM, poseYs, TOP_Y } from '@/three/k1-layout'

export type HeroPhase = 'poster' | 'boot' | 'live' | 'lost'

const INTRO_MS = 700
const PULSE_MS = 1200
const LOST_MS = 2000
const DPR_CAP = 1.5
const PAINT_EPS = 1e-4
const VIA_LEN = TOP_Y - BOT_Y

const FILL = 0xffffff
const INK = 0x7b7f8a
const ACCENT = 0x1e3a5f

type GsapTicker = {
  add: (fn: () => void) => void
  remove: (fn: () => void) => void
}

function yieldTask(): Promise<void> {
  return new Promise((resolve) => {
    const sched = (globalThis as unknown as { scheduler?: { yield?: () => Promise<void> } }).scheduler
    if (typeof sched?.yield === 'function') {
      void sched.yield().then(() => resolve())
      return
    }
    window.setTimeout(resolve, 0)
  })
}

function setPhase(box: HTMLElement, phase: HeroPhase) {
  box.dataset.hero3d = phase
}

function readAccent(el: HTMLElement) {
  const css = getComputedStyle(el).getPropertyValue('--color-accent').trim()
  return css ? new Color(css) : new Color(ACCENT)
}

export function applyHeroPose(root: Object3D, p: number) {
  const ys = poseYs(p)
  root.getObjectByName('layer-bot')?.position.setY(ys.bot)
  root.getObjectByName('layer-sub')?.position.setY(ys.sub)
  root.getObjectByName('layer-top')?.position.setY(ys.top)
  root.getObjectByName('layer-chip')?.position.setY(ys.chip)
  const accent = root.getObjectByName('track-accent')
  if (!accent) return
  const span = ys.top + TOP_Y - (ys.bot + BOT_Y)
  accent.scale.setY(VIA_LEN > 0 ? span / VIA_LEN : 1)
  accent.position.setY((ys.bot + ys.top) / 2)
  accent.visible = p >= 0.5
}

export function bindHeroMaterials(root: Object3D, accent: Color) {
  const fill = new MeshBasicMaterial({
    color: FILL,
    transparent: false,
    depthTest: true,
    depthWrite: true,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  })
  const ink = new LineBasicMaterial({
    color: INK,
    transparent: false,
    depthTest: true,
    depthWrite: true,
  })
  const accentMat = new LineBasicMaterial({
    color: accent,
    transparent: false,
    depthTest: true,
    depthWrite: true,
  })
  root.traverse((obj) => {
    const mesh = obj as Object3D & { isMesh?: boolean; isLineSegments?: boolean; material?: unknown; name: string }
    if (mesh.isMesh) mesh.material = fill
    if (mesh.isLineSegments) {
      const named = mesh.name.startsWith('via-') || mesh.name === 'track-accent'
      const parent = mesh.parent?.name === 'track-accent'
      mesh.material = named || parent ? accentMat : ink
    }
  })
  return { fill, ink, accent: accentMat }
}

function fitCam(cam: OrthographicCamera, aspect: number) {
  cam.left = -FRUSTUM * aspect
  cam.right = FRUSTUM * aspect
  cam.top = FRUSTUM
  cam.bottom = -FRUSTUM
  cam.updateProjectionMatrix()
}

function posterEl(box: HTMLElement) {
  return box.querySelector<HTMLElement>('.hero-3d-poster')
}

export async function startHero3d(box: HTMLElement): Promise<() => void> {
  setPhase(box, 'boot')
  const glbBuf = fetch('/hero/k1.glb').then((res) => {
    if (!res.ok) throw new Error('glb')
    return res.arrayBuffer()
  })

  await yieldTask()
  const loader = new GLTFLoader()
  await yieldTask()
  const buf = await glbBuf
  await yieldTask()
  const gltf = await loader.parseAsync(buf, '/hero/')
  await yieldTask()

  const scene = new Scene()
  const root = gltf.scene
  scene.add(root)
  const cam = (gltf.cameras[0] ?? root.getObjectByName('hero-cam')) as OrthographicCamera | undefined
  if (!cam) throw new Error('cam')

  const accent0 = readAccent(box)
  const mats = bindHeroMaterials(root, accent0)
  const pulseTo = accent0.clone().lerp(new Color(0xffffff), 0.35)
  applyHeroPose(root, 0)

  const canvas = document.createElement('canvas')
  canvas.setAttribute('aria-hidden', 'true')
  canvas.tabIndex = -1
  box.appendChild(canvas)

  const params: WebGLRendererParameters = {
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'low-power',
    failIfMajorPerformanceCaveat: true,
  }
  let renderer: WebGLRenderer
  try {
    renderer = new WebGLRenderer(params)
  } catch {
    canvas.remove()
    setPhase(box, 'poster')
    return () => {}
  }
  renderer.setClearColor(0x000000, 0)
  renderer.autoClear = true
  await yieldTask()

  let progress = 0
  let disposed = false
  let live = false
  let forcePaint = false
  let lastPainted = Number.NaN
  let pulseStart = 0
  let ticker: GsapTicker | null = null
  let tickerBound = false
  let stopScroll = () => {}
  let lostTimer = 0

  const sizeToBox = () => {
    const w = Math.max(1, box.clientWidth)
    const h = Math.max(1, box.clientHeight)
    const dpr = Math.min(Math.max(1, window.devicePixelRatio || 1), DPR_CAP)
    renderer.setPixelRatio(dpr)
    renderer.setSize(w, h, false)
    fitCam(cam, w / h)
  }

  const paint = () => {
    applyHeroPose(root, progress)
    if (pulseStart) {
      const t = Math.min(1, (performance.now() - pulseStart) / PULSE_MS)
      const u = t < 0.5 ? t * 2 : (1 - t) * 2
      mats.accent.color.copy(accent0).lerp(pulseTo, u)
      if (t >= 1) {
        mats.accent.color.copy(accent0)
        pulseStart = 0
      }
    }
    renderer.render(scene, cam)
  }

  const stopTicker = () => {
    if (!tickerBound || !ticker) return
    ticker.remove(onTicker)
    tickerBound = false
  }

  function onTicker() {
    if (disposed) {
      stopTicker()
      return
    }
    const pulsing = pulseStart > 0
    const force = forcePaint || pulsing
    forcePaint = false
    if (!force && Number.isFinite(lastPainted) && Math.abs(progress - lastPainted) <= PAINT_EPS) {
      stopTicker()
      return
    }
    lastPainted = progress
    paint()
    if (pulsing) requestRender(true)
    else stopTicker()
  }

  function requestRender(force = false) {
    if (force) forcePaint = true
    if (!ticker || tickerBound) return
    tickerBound = true
    ticker.add(onTicker)
  }

  const reveal = () => {
    if (disposed || live) return
    live = true
    box.classList.add('is-live')
    setPhase(box, 'live')
    const img = posterEl(box)
    const finish = () => img?.classList.add('is-done')
    canvas.addEventListener('transitionend', (ev) => {
      if (ev.propertyName === 'opacity') finish()
    })
    window.setTimeout(finish, 360)
    window.setTimeout(() => {
      if (disposed || progress > PAINT_EPS) return
      pulseStart = performance.now()
      requestRender(true)
    }, INTRO_MS)
  }

  const showPoster = (phase: HeroPhase) => {
    live = false
    box.classList.remove('is-live')
    posterEl(box)?.classList.remove('is-done')
    setPhase(box, phase)
  }

  const onLost = (event: Event) => {
    event.preventDefault()
    stopTicker()
    stopScroll()
    if (lostTimer) window.clearTimeout(lostTimer)
    lostTimer = window.setTimeout(() => {
      if (disposed) return
      showPoster('lost')
    }, LOST_MS)
  }

  const onRestored = () => {
    if (disposed) return
    if (lostTimer) window.clearTimeout(lostTimer)
    lostTimer = 0
    sizeToBox()
    applyHeroPose(root, progress)
    renderer.render(scene, cam)
    lastPainted = progress
    requestAnimationFrame(() => {
      if (disposed) return
      showPoster('live')
      box.classList.add('is-live')
      setPhase(box, 'live')
    })
  }

  const onTheme = () => {
    const next = readAccent(box)
    accent0.copy(next)
    pulseTo.copy(next).lerp(new Color(0xffffff), 0.35)
    mats.accent.color.copy(next)
    requestRender(true)
  }

  const dispose = () => {
    if (disposed) return
    disposed = true
    if (lostTimer) window.clearTimeout(lostTimer)
    stopTicker()
    stopScroll()
    document.removeEventListener('visibilitychange', onVis)
    window.removeEventListener('pagehide', dispose)
    themeMo.disconnect()
    ro.disconnect()
    canvas.removeEventListener('webglcontextlost', onLost, true)
    canvas.removeEventListener('webglcontextrestored', onRestored, true)
    root.traverse((obj) => {
      const mesh = obj as Object3D & { geometry?: { dispose: () => void } }
      mesh.geometry?.dispose()
    })
    mats.fill.dispose()
    mats.ink.dispose()
    mats.accent.dispose()
    renderer.dispose()
    canvas.remove()
    showPoster('poster')
  }

  const onVis = () => {
    if (document.hidden) {
      stopTicker()
      return
    }
    requestRender(true)
  }

  canvas.addEventListener('webglcontextlost', onLost, true)
  canvas.addEventListener('webglcontextrestored', onRestored, true)
  document.addEventListener('visibilitychange', onVis)
  window.addEventListener('pagehide', dispose)
  const themeMo = new MutationObserver(onTheme)
  themeMo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  const ro = new ResizeObserver(() => {
    sizeToBox()
    requestRender(true)
  })
  ro.observe(box)

  sizeToBox()
  await yieldTask()
  try {
    await renderer.compileAsync(scene, cam)
  } catch {
    renderer.compile(scene, cam)
  }
  await yieldTask()
  paint()
  lastPainted = progress
  requestAnimationFrame(() => {
    if (!disposed) reveal()
  })

  const { default: gsap } = await import('gsap')
  ticker = gsap.ticker
  stopScroll = attachHeroScroll((p) => {
    if (Math.abs(p - progress) <= PAINT_EPS) return
    pulseStart = 0
    mats.accent.color.copy(accent0)
    progress = p
    requestRender()
  }, { skipInitial: true })

  return dispose
}
