import { Color, Scene, WebGLRenderer } from 'three'
import type { OrthographicCamera } from 'three'
import { C_OBJECTS } from '@/lib/c-objects'
import { mark3dWatchdog } from '@/lib/three-gate'
import { createCObject, disposeObject, makeCCamera } from './scene-c'
import type { BakedObject } from './types'

type Slot = {
  id: string
  el: HTMLElement
  scene: Scene
  camera: OrthographicCamera
  root: ReturnType<typeof createCObject>['root']
  layers: ReturnType<typeof createCObject>['layers']
  explode: number
}

const DATA: Record<string, () => Promise<{ default: BakedObject }>> = {
  'c-pi': () => import('./generated/c-pi.data'),
  'c-pcb': () => import('./generated/c-pcb.data'),
  'c-sw': () => import('./generated/c-sw.data'),
}

let renderer: WebGLRenderer | null = null
let canvas: HTMLCanvasElement | null = null
let raf = 0
let gen = 0
let slots: Slot[] = []
let last = 0
const frameMs: number[] = []
let watchdogOff = false
let debugEl: HTMLElement | null = null
let scissorMax = 0
let scissorWindowMax = 0
let scissorWindowAt = 0

function qaParam(): 'force' | 'debug' | null {
  if (!__3D_QA__) return null
  const v = new URLSearchParams(location.search).get('3d')
  if (v === 'force' || v === 'debug') return v
  return null
}

function readColors(el: HTMLElement) {
  const css = getComputedStyle(el)
  const ink = new Color(css.color || '#0b2545')
  const raw = css.getPropertyValue('--line-blueprint').trim() || '#1f5fad'
  return { ink, blue: new Color(raw) }
}

function ensureCanvas() {
  if (renderer && canvas) return
  const el = document.createElement('canvas')
  el.className = 'scene3d-canvas'
  el.setAttribute('aria-hidden', 'true')
  el.tabIndex = -1
  document.body.appendChild(el)
  const r = new WebGLRenderer({ canvas: el, alpha: true, antialias: true, powerPreference: 'low-power' })
  r.setClearColor(0x000000, 0)
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
  r.autoClear = false
  r.setScissorTest(true)
  canvas = el
  renderer = r
  r.domElement.addEventListener('webglcontextlost', onLost, false)
}

function onLost(event: Event) {
  event.preventDefault()
  mark3dWatchdog()
  stopView()
}

function sizeRenderer() {
  if (!renderer || !canvas) return
  const w = canvas.clientWidth
  const h = canvas.clientHeight
  renderer.setSize(w, h, false)
}

function visibleRect(el: HTMLElement) {
  const rect = el.getBoundingClientRect()
  const h = renderer?.domElement.clientHeight ?? 0
  const w = renderer?.domElement.clientWidth ?? 0
  if (rect.bottom < 0 || rect.top > h || rect.right < 0 || rect.left > w) return null
  if (rect.width < 2 || rect.height < 2) return null
  return rect
}

function tick(now: number) {
  raf = 0
  if (!renderer || !canvas) return
  const dt = last ? now - last : 16
  last = now
  frameMs.push(dt)
  if (frameMs.length > 90) frameMs.shift()
  if (!watchdogOff && qaParam() !== 'force' && frameMs.length >= 90) {
    const sorted = [...frameMs].sort((a, b) => a - b)
    const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? dt
    if (p95 > 22) {
      mark3dWatchdog()
      stopView()
      return
    }
  }

  sizeRenderer()
  renderer.setClearColor(0x000000, 0)
  renderer.clear()

  let any = false
  let maxDelta = 0
  const vh = canvas.clientHeight

  for (const slot of slots) {
    const rect = visibleRect(slot.el)
    if (!rect) continue
    any = true
    slot.explode = Math.min(1, slot.explode + dt / 900)
    const open = Math.sin(slot.explode * Math.PI)
    const world = (8 / Math.max(rect.height, 1)) * 2.7
    slot.layers.forEach((layer, i) => {
      layer.position.y = i * world * open
    })
    const progress = Math.min(1, Math.max(0, 1 - rect.top / Math.max(window.innerHeight, 1)))
    slot.root.rotation.y = ((-20 + 40 * progress) * Math.PI) / 180

    const left = rect.left
    const bottom = vh - rect.bottom
    renderer.setViewport(left, bottom, rect.width, rect.height)
    renderer.setScissor(left, bottom, rect.width, rect.height)
    renderer.render(slot.scene, slot.camera)

    const after = slot.el.getBoundingClientRect()
    maxDelta = Math.max(
      maxDelta,
      Math.abs(after.left - rect.left),
      Math.abs(after.top - rect.top),
      Math.abs(after.width - rect.width),
      Math.abs(after.height - rect.height),
    )
  }

  scissorMax = maxDelta
  if (now - scissorWindowAt > 2000) {
    scissorWindowMax = maxDelta
    scissorWindowAt = now
  } else {
    scissorWindowMax = Math.max(scissorWindowMax, maxDelta)
  }

  if (__3D_QA__ && debugEl) {
    const sorted = [...frameMs].sort((a, b) => a - b)
    const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0
    debugEl.textContent = `3d debug · full · dpr ${renderer.getPixelRatio().toFixed(2)} · p95 ${p95.toFixed(1)}ms · scissor ${scissorMax.toFixed(2)}px (2s max ${scissorWindowMax.toFixed(2)}) · watchdog ${watchdogOff ? 'off' : 'on'}`
  }

  if (any) raf = requestAnimationFrame(tick)
}

function onVis() {
  if (document.hidden) {
    if (raf) cancelAnimationFrame(raf)
    raf = 0
    last = 0
    return
  }
  requestLoop()
}

function requestLoop() {
  if (raf || !renderer) return
  raf = requestAnimationFrame(tick)
}

function onResize() {
  sizeRenderer()
  requestLoop()
}

async function attachSlots(my: number) {
  const next: Slot[] = []
  const first = document.querySelector<HTMLElement>('[data-scene3d]')
  const { ink, blue } = first ? readColors(first) : { ink: new Color('#0b2545'), blue: new Color('#1f5fad') }

  for (const spec of C_OBJECTS) {
    if (my !== gen) break
    const el = document.querySelector<HTMLElement>(`[data-scene3d="${spec.id}"]`)
    if (!el) continue
    const loader = DATA[spec.id]
    if (!loader) continue
    const { default: data } = await loader()
    if (my !== gen) break
    const { root, layers } = createCObject(data, ink, blue)
    const scene = new Scene()
    scene.add(root)
    next.push({
      id: spec.id,
      el,
      scene,
      camera: makeCCamera(),
      root,
      layers,
      explode: 0,
    })
  }

  if (my !== gen) {
    for (const slot of next) disposeObject(slot.scene)
    return
  }
  slots = next
}

function mountDebug() {
  if (!__3D_QA__ || qaParam() !== 'debug') return
  const bar = document.createElement('div')
  bar.setAttribute('data-3d-debug', '')
  bar.style.cssText =
    'position:fixed;left:0;right:0;bottom:0;z-index:80;padding:4px 8px;font:11px/1.3 ui-monospace,monospace;background:#0b2545;color:#fafbfc;pointer-events:none'
  document.body.appendChild(bar)
  debugEl = bar
}

export async function startView() {
  if (renderer) return
  const my = ++gen
  watchdogOff = qaParam() === 'force'
  ensureCanvas()
  sizeRenderer()
  await attachSlots(my)
  if (my !== gen) return
  if (slots.length === 0) {
    stopView()
    return
  }
  mountDebug()
  document.documentElement.classList.add('is-3d-ready')
  window.addEventListener('resize', onResize)
  document.addEventListener('visibilitychange', onVis)
  requestLoop()
}

export function stopView() {
  gen += 1
  if (raf) cancelAnimationFrame(raf)
  raf = 0
  last = 0
  window.removeEventListener('resize', onResize)
  document.removeEventListener('visibilitychange', onVis)
  document.documentElement.classList.remove('is-3d-ready')
  debugEl?.remove()
  debugEl = null
  for (const slot of slots) {
    disposeObject(slot.scene)
  }
  slots = []
  if (renderer) {
    renderer.domElement.removeEventListener('webglcontextlost', onLost, false)
    renderer.dispose()
    renderer.forceContextLoss()
  }
  renderer = null
  canvas?.remove()
  canvas = null
  frameMs.length = 0
}
