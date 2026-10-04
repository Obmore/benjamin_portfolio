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

export type HeroPhase = 'poster' | 'boot' | 'live' | 'lost'

const PULSE_MS = 1200
const LOST_MS = 2000
const DPR_CAP = 2
const PAINT_EPS = 1e-4
const FRUSTUM = 1.48
const BW = 2.4
const EXPLODE = 0.18
const CHIP_LIFT = 0.08
const FILL = 0xffffff
const INK = 0x7b7f8a
const ACCENT = 0x1e3a5f

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
  if (css.startsWith('#') || css.startsWith('rgb')) return new Color(css)
  return new Color(ACCENT)
}

function poseYs(p: number) {
  const explode = Math.min(1, p / 0.5)
  const rest = Math.max(0, (p - 0.5) / 0.5)
  const gap = BW * EXPLODE * explode
  const chipLift = BW * CHIP_LIFT * rest
  return { top: gap, chip: gap + chipLift, sub: 0, bot: -gap }
}

function isMesh(obj: Object3D): obj is Object3D & { isMesh: true; material: unknown } {
  return 'isMesh' in obj && Boolean((obj as { isMesh?: boolean }).isMesh)
}

function isLine(obj: Object3D): obj is Object3D & { isLine: true; material: unknown } {
  const rec = obj as { isLine?: boolean; isLineSegments?: boolean }
  return Boolean(rec.isLine || rec.isLineSegments)
}

function isAccentNode(obj: Object3D) {
  let node: Object3D | null = obj
  while (node) {
    if (node.name === 'track-accent' || node.name.startsWith('via-')) return true
    node = node.parent
  }
  return false
}

export function applyHeroPose(root: Object3D, p: number) {
  const ys = poseYs(p)
  const showAccent = p >= 0.5
  root.traverse((obj) => {
    if (obj.name === 'layer-bot') obj.position.setY(ys.bot)
    else if (obj.name === 'layer-sub') obj.position.setY(ys.sub)
    else if (obj.name === 'layer-top') obj.position.setY(ys.top)
    else if (obj.name === 'layer-chip') obj.position.setY(ys.chip)
    else if (obj.name === 'track-accent') obj.visible = showAccent
  })
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
    if (isMesh(obj)) obj.material = fill
    if (isLine(obj)) {
      obj.frustumCulled = false
      obj.material = isAccentNode(obj) ? accentMat : ink
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

/** One context and requested frames only; no perpetual animation ticker. */
export async function startHero3d(box: HTMLElement, canvas: HTMLCanvasElement,
  context: WebGL2RenderingContext, signal: AbortSignal): Promise<() => void> {
  const response = await fetch('/hero/k1.glb', { signal })
  if (!response.ok) throw new Error('glb')
  const buffer = await response.arrayBuffer()
  await yieldTask()
  const gltf = await new GLTFLoader().parseAsync(buffer, '/hero/')
  signal.throwIfAborted()
  await yieldTask()
  const scene = new Scene(), root = gltf.scene
  scene.add(root)
  const cam = gltf.cameras[0] as OrthographicCamera
  if (!cam?.isOrthographicCamera) throw new Error('camera')
  const accent = readAccent(box), mats = bindHeroMaterials(root, accent)
  const pulseTo = accent.clone().lerp(new Color(0xffffff), .35)
  const params: WebGLRendererParameters = { canvas, context, alpha: true, antialias: true,
    powerPreference: 'low-power', failIfMajorPerformanceCaveat: true }
  const renderer = new WebGLRenderer(params)
  renderer.setClearColor(0, 0)
  canvas.setAttribute('aria-hidden', 'true'); canvas.tabIndex = -1
  box.appendChild(canvas)
  let disposed = false, lost = false, ready = false, frame = 0, lostTimer = 0
  let progress = 0, painted = NaN, pulse = 0
  const hero = document.getElementById('hero')!
  const size = () => {
    const { width, height } = box.getBoundingClientRect()
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPR_CAP))
    renderer.setSize(Math.max(1, width), Math.max(1, height), false)
    fitCam(cam, width / height)
  }
  const readProgress = () => Math.max(0, Math.min(1,
    -hero.getBoundingClientRect().top / Math.max(1, hero.offsetHeight - innerHeight * .35)))
  const poster = (phase: HeroPhase) => {
    box.classList.remove('is-live'); posterEl(box)?.classList.remove('is-done'); setPhase(box, phase)
  }
  const draw = () => {
    frame = 0
    if (disposed || lost || document.hidden) return
    progress = readProgress(); applyHeroPose(root, progress)
    if (pulse) {
      const t = Math.min(1, (performance.now() - pulse) / PULSE_MS)
      mats.accent.color.copy(accent).lerp(pulseTo, Math.sin(t * Math.PI))
      if (t >= 1) pulse = 0
    }
    renderer.render(scene, cam); painted = progress
    if (pulse) request()
  }
  const request = () => {
    if (!frame && ready && !disposed && !lost && !document.hidden) frame = requestAnimationFrame(draw)
  }
  const stop = () => { cancelAnimationFrame(frame); frame = 0; pulse = 0 }
  const scroll = () => {
    const p = readProgress()
    if (p >= .5 && painted < .5 && box.getBoundingClientRect().bottom > 0) pulse = performance.now()
    if (Math.abs(p - painted) > PAINT_EPS) request()
  }
  const resize = () => { if (!lost && !disposed) { size(); request() } }
  const visibility = () => { if (document.hidden) stop(); else request() }
  const onLost = (event: Event) => {
    event.preventDefault(); lost = true; stop(); poster('lost'); clearTimeout(lostTimer)
    lostTimer = window.setTimeout(() => poster('lost'), LOST_MS)
  }
  // Renderer registers first: its internal restoration precedes this one frame.
  const onRestored = () => {
    if (disposed) return
    clearTimeout(lostTimer); lost = false; size()
    frame = requestAnimationFrame(() => {
      draw()
      if (disposed || document.hidden) return
      box.classList.add('is-live'); posterEl(box)?.classList.add('is-done'); setPhase(box, 'live')
    })
  }
  const ro = new ResizeObserver(resize)
  const dispose = () => {
    if (disposed) return
    disposed = true; stop(); clearTimeout(lostTimer); ro.disconnect()
    window.removeEventListener('scroll', scroll)
    document.removeEventListener('visibilitychange', visibility)
    signal.removeEventListener('abort', dispose)
    canvas.removeEventListener('webglcontextlost', onLost)
    canvas.removeEventListener('webglcontextrestored', onRestored)
    root.traverse(obj => (obj as Object3D & {geometry?: {dispose: () => void}}).geometry?.dispose())
    mats.fill.dispose(); mats.ink.dispose(); mats.accent.dispose()
    renderer.dispose(); canvas.remove(); poster('poster')
  }
  signal.addEventListener('abort', dispose, { once: true })
  canvas.addEventListener('webglcontextlost', onLost)
  canvas.addEventListener('webglcontextrestored', onRestored)
  window.addEventListener('scroll', scroll, { passive: true })
  document.addEventListener('visibilitychange', visibility)
  try {
    size(); progress = readProgress(); applyHeroPose(root, progress)
    await yieldTask(); await renderer.compileAsync(scene, cam); await yieldTask()
    signal.throwIfAborted()
    if (lost) return dispose
    draw(); ready = true
    frame = requestAnimationFrame(() => {
      frame = 0
      if (disposed || lost || document.hidden) return
      box.classList.add('is-live'); posterEl(box)?.classList.add('is-done'); setPhase(box, 'live')
    })
    ro.observe(box)
    return dispose
  } catch (error) { dispose(); throw error }
}

