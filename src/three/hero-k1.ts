import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  Points,
  PointsMaterial,
  Vector3,
} from 'three'
import {
  allBotPads,
  allTopPads,
  BD,
  botTraces,
  BT,
  BW,
  CHIP,
  CHIP_LIFT,
  chipPins,
  conn,
  connPins,
  EXPLODE,
  loop,
  passives,
  topTraces,
  vias,
  type PathNode,
  type Poly,
} from './k1-layout'

export type K1Colors = { surface: Color; ink: Color; accent: Color; line: Color }

export type K1Scene = {
  root: Group
  camera: OrthographicCamera
  frustum: number
  layers: { parts: Group; top: Group; sub: Group; bot: Group }
  mats: {
    fill: MeshBasicMaterial
    sub: MeshBasicMaterial
    ink: LineBasicMaterial
    accent: LineBasicMaterial
    topTrace: LineBasicMaterial
    botTrace: LineBasicMaterial
    grid: PointsMaterial
  }
  vias: LineSegments
  pulse: LineSegments
  grid: Points
  lite: boolean
  endsLocal: { traces: Vector3[]; pads: Vector3[]; vias: Vector3[]; pins: Vector3[] }
}

const FRUSTUM = 1.62
const CAM_D = 12

function box(w: number, h: number, d: number, x: number, y: number, z: number) {
  const g = new BoxGeometry(w, h, d)
  g.translate(x, y, z)
  return g
}

function mergeMesh(geos: BufferGeometry[]) {
  let vc = 0
  let ic = 0
  for (const g of geos) {
    vc += g.getAttribute('position').count
    ic += g.index ? g.index.count : 0
  }
  const pos = new Float32Array(vc * 3)
  const idx = new Uint32Array(ic)
  let po = 0
  let io = 0
  let vo = 0
  for (const g of geos) {
    const p = g.getAttribute('position')
    pos.set(p.array as Float32Array, po)
    if (g.index) {
      const a = g.index.array
      for (let i = 0; i < a.length; i++) idx[io++] = (a[i] as number) + vo
    }
    po += p.count * 3
    vo += p.count
    g.dispose()
  }
  const out = new BufferGeometry()
  out.setAttribute('position', new BufferAttribute(pos, 3))
  out.setIndex(new BufferAttribute(idx, 1))
  return out
}

function mergeEdges(geos: BufferGeometry[]) {
  const acc: number[] = []
  for (const g of geos) {
    const e = new EdgesGeometry(g, 20)
    const a = e.getAttribute('position').array as ArrayLike<number>
    for (let i = 0; i < a.length; i++) acc.push(a[i] as number)
    e.dispose()
  }
  const out = new BufferGeometry()
  out.setAttribute('position', new BufferAttribute(new Float32Array(acc), 3))
  return out
}

function polyLines(polys: readonly Poly[], y: number) {
  const acc: number[] = []
  for (const poly of polys) {
    for (let i = 0; i < poly.length - 1; i++) {
      const a = poly[i]
      const b = poly[i + 1]
      acc.push(a[0], y, a[1], b[0], y, b[1])
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(acc), 3))
  return g
}

function addMesh(parent: Group, geo: BufferGeometry, mat: MeshBasicMaterial) {
  const m = new Mesh(geo, mat)
  parent.add(m)
  return m
}

function addLines(parent: Group, geo: BufferGeometry, mat: LineBasicMaterial) {
  const l = new LineSegments(geo, mat)
  parent.add(l)
  return l
}

function placeCam(cam: OrthographicCamera, elev: number, azim: number) {
  const el = (elev * Math.PI) / 180
  const az = (azim * Math.PI) / 180
  cam.position.set(CAM_D * Math.cos(el) * Math.sin(az), CAM_D * Math.sin(el), CAM_D * Math.cos(el) * Math.cos(az))
  cam.lookAt(0, 0, 0)
  cam.updateProjectionMatrix()
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function layerYs(explode: number, lite: boolean) {
  const step = BW * EXPLODE * explode
  if (lite) {
    return { parts: step * 0.5, top: step * 0.5, sub: 0, bot: -step * 0.5 }
  }
  return { parts: step * 1.5, top: step * 0.5, sub: -step * 0.5, bot: -step * 1.5 }
}

function nodeY(node: PathNode, ys: ReturnType<typeof layerYs>, chipLift: number) {
  if (node.layer === 'bot') return ys.bot
  if (node.layer === 'chip') return ys.parts + BT / 2 + 0.04 + chipLift
  return ys.top
}

function sampleLoop(u: number, ys: ReturnType<typeof layerYs>, chipLift: number, out: Vector3) {
  const pts = loop
  const n = pts.length - 1
  const t = u * n
  const i = Math.min(n - 1, Math.floor(t))
  const f = t - i
  const a = pts[i]
  const b = pts[i + 1]
  out.set(lerp(a.x, b.x, f), lerp(nodeY(a, ys, chipLift), nodeY(b, ys, chipLift), f), lerp(a.z, b.z, f))
}

export function makeK1Camera() {
  const f = FRUSTUM
  const cam = new OrthographicCamera(-f, f, f, -f, 0.1, 40)
  placeCam(cam, 30, 45)
  return cam
}

export function createK1Scene(colors: K1Colors, lite: boolean): K1Scene {
  const root = new Group()
  const fill = new MeshBasicMaterial({ color: colors.surface })
  const subMat = new MeshBasicMaterial({
    color: colors.surface,
    transparent: true,
    opacity: 0.15,
    depthWrite: false,
  })
  const ink = new LineBasicMaterial({ color: colors.ink, transparent: true, opacity: 0.7 })
  const accent = new LineBasicMaterial({ color: colors.accent })
  const topTrace = new LineBasicMaterial({ color: colors.ink, transparent: true, opacity: 0.7 })
  const botTrace = new LineBasicMaterial({ color: colors.ink, transparent: true, opacity: 0.7 })
  const gridMat = new PointsMaterial({
    color: colors.line,
    size: 1.6,
    sizeAttenuation: false,
  })

  const parts = new Group()
  const top = new Group()
  const sub = new Group()
  const bot = new Group()

  const partGeos: BufferGeometry[] = [
    box(CHIP, 0.1, CHIP, 0, BT / 2 + 0.05, 0),
    box(conn.w, conn.h, conn.d, conn.x, BT / 2 + conn.h / 2, conn.z),
  ]
  for (const p of chipPins()) partGeos.push(box(p.w, 0.028, p.d, p.x, BT / 2 + 0.02, p.z))
  for (const p of connPins()) partGeos.push(box(0.05, 0.03, 0.04, p.x, BT / 2 + 0.03, p.z))
  for (const p of passives) partGeos.push(box(p.w, p.h, p.d, p.x, BT / 2 + p.h / 2, p.z))

  const partsMesh = mergeMesh(partGeos.map((g) => g.clone()))
  const partsEdge = mergeEdges(partGeos)
  addMesh(parts, partsMesh, fill)
  addLines(parts, partsEdge, ink)
  for (const g of partGeos) g.dispose()

  const topY = BT / 2 + 0.004
  addLines(top, polyLines([...topTraces, ...allTopPads()], topY), topTrace)

  if (!lite) {
    const subGeo = box(BW, BT, BD, 0, 0, 0)
    addMesh(sub, subGeo, subMat)
    addLines(sub, new EdgesGeometry(subGeo, 20), ink)
  }

  const botY = -BT / 2 - 0.004
  const ground = box(BW * 0.92, 0.012, BD * 0.92, 0, botY, 0)
  addMesh(bot, ground, fill)
  if (!lite) addLines(bot, new EdgesGeometry(ground, 20), ink)
  addLines(bot, polyLines([...botTraces, ...allBotPads()], botY), botTrace)

  const viaPos = new Float32Array(vias.length * 6)
  const viaLines = new LineSegments(new BufferGeometry(), accent)
  viaLines.geometry.setAttribute('position', new BufferAttribute(viaPos, 3))
  viaLines.frustumCulled = false

  const pulseGeo = new BufferGeometry()
  pulseGeo.setAttribute('position', new BufferAttribute(new Float32Array(18), 3))
  const pulse = new LineSegments(pulseGeo, accent)
  pulse.frustumCulled = false

  const gridGeo = new BufferGeometry()
  gridGeo.setAttribute('position', new BufferAttribute(new Float32Array(3), 3))
  const grid = new Points(gridGeo, gridMat)

  if (lite) {
    top.add(parts)
    root.add(top, bot, viaLines, pulse, grid)
  } else {
    root.add(parts, top, sub, bot, viaLines, pulse, grid)
  }

  const endsLocal = {
    traces: [] as Vector3[],
    pads: [] as Vector3[],
    vias: [] as Vector3[],
    pins: [] as Vector3[],
  }
  const pushEnd = (list: Vector3[], x: number, y: number, z: number) => list.push(new Vector3(x, y, z))
  for (const poly of topTraces) {
    const a = poly[0]
    const b = poly[poly.length - 1]
    pushEnd(endsLocal.traces, a[0], topY, a[1])
    pushEnd(endsLocal.traces, b[0], topY, b[1])
  }
  for (const poly of botTraces) {
    const a = poly[0]
    const b = poly[poly.length - 1]
    pushEnd(endsLocal.traces, a[0], botY, a[1])
    pushEnd(endsLocal.traces, b[0], botY, b[1])
  }
  for (const [x, z] of vias) {
    pushEnd(endsLocal.vias, x, topY, z)
    pushEnd(endsLocal.vias, x, botY, z)
    pushEnd(endsLocal.pads, x, topY, z)
    pushEnd(endsLocal.pads, x, botY, z)
  }
  for (const p of chipPins()) pushEnd(endsLocal.pins, p.x, BT / 2 + 0.02, p.z)
  for (const p of connPins()) pushEnd(endsLocal.pads, p.x, BT / 2 + 0.03, p.z)

  const scene: K1Scene = {
    root,
    camera: makeK1Camera(),
    frustum: FRUSTUM,
    layers: { parts, top, sub, bot },
    mats: { fill, sub: subMat, ink, accent, topTrace, botTrace, grid: gridMat },
    vias: viaLines,
    pulse,
    grid,
    lite,
    endsLocal,
  }
  applyK1Progress(scene, 0, 0)
  return scene
}

export function setK1Colors(scene: K1Scene, colors: K1Colors) {
  scene.mats.fill.color.copy(colors.surface)
  scene.mats.sub.color.copy(colors.surface)
  scene.mats.ink.color.copy(colors.ink)
  scene.mats.accent.color.copy(colors.accent)
  scene.mats.botTrace.color.copy(colors.ink)
  scene.mats.grid.color.copy(colors.line)
}

export function setK1Aspect(scene: K1Scene, aspect: number) {
  const f = scene.frustum
  scene.camera.left = -f * aspect
  scene.camera.right = f * aspect
  scene.camera.top = f
  scene.camera.bottom = -f
  scene.camera.updateProjectionMatrix()
}

export function layoutGrid(scene: K1Scene, px: number, worldH: number) {
  const step = (24 / Math.max(px, 1)) * worldH
  const y = -BW * EXPLODE * 1.7 - 0.15
  const acc: number[] = []
  const limX = 1.55
  const limZ = 1.15
  for (let x = -limX; x <= limX + 1e-6; x += step) {
    for (let z = -limZ; z <= limZ + 1e-6; z += step) {
      acc.push(x, y, z)
    }
  }
  scene.grid.geometry.setAttribute('position', new BufferAttribute(new Float32Array(acc), 3))
  scene.grid.geometry.computeBoundingSphere()
}

export function applyK1Progress(scene: K1Scene, p: number, pulseU: number) {
  const explode = Math.min(1, p / 0.5)
  const rest = Math.max(0, (p - 0.5) / 0.5)
  const azim = p <= 0.5 ? lerp(45, 20, explode) : lerp(20, 0, rest)
  const elev = p <= 0.5 ? lerp(30, 38, explode) : lerp(38, 55, rest)
  placeCam(scene.camera, elev, azim)

  const ys = layerYs(explode, scene.lite)
  const chipLift = rest * BW * CHIP_LIFT
  scene.layers.parts.position.y = ys.parts + (scene.lite ? 0 : chipLift)
  scene.layers.top.position.y = ys.top
  scene.layers.sub.position.y = ys.sub
  scene.layers.bot.position.y = ys.bot
  if (scene.lite) scene.layers.parts.position.y = chipLift

  const viaAttr = scene.vias.geometry.getAttribute('position')
  const va = viaAttr.array as Float32Array
  const topY = ys.top + BT / 2 + 0.004
  const botY = ys.bot - BT / 2 - 0.004
  for (let i = 0; i < vias.length; i++) {
    const [x, z] = vias[i]
    const o = i * 6
    va[o] = x
    va[o + 1] = topY
    va[o + 2] = z
    va[o + 3] = x
    va[o + 4] = botY
    va[o + 5] = z
  }
  viaAttr.needsUpdate = true

  const accentAmt = Math.min(1, p / 0.5)
  scene.mats.topTrace.color.lerpColors(scene.mats.ink.color, scene.mats.accent.color, accentAmt)
  scene.mats.topTrace.opacity = 0.7 + 0.3 * accentAmt
  scene.mats.botTrace.color.lerpColors(scene.mats.ink.color, scene.mats.accent.color, Math.max(0, (p - 0.5) * 2))
  scene.mats.botTrace.opacity = 0.7 + 0.3 * Math.max(0, (p - 0.5) * 2)

  const trail = 0.08
  const pa = scene.pulse.geometry.getAttribute('position')
  const arr = pa.array as Float32Array
  const a = new Vector3()
  const b = new Vector3()
  for (let i = 0; i < 3; i++) {
    const u0 = Math.max(0, pulseU - trail * (i + 1) / 3)
    const u1 = Math.max(0, pulseU - (trail * i) / 3)
    sampleLoop(u0, ys, chipLift, a)
    sampleLoop(u1, ys, chipLift, b)
    const o = i * 6
    arr[o] = a.x
    arr[o + 1] = a.y
    arr[o + 2] = a.z
    arr[o + 3] = b.x
    arr[o + 4] = b.y
    arr[o + 5] = b.z
  }
  pa.needsUpdate = true
}

export function projectEnds(
  scene: K1Scene,
  width: number,
  height: number,
  p: number,
) {
  const explode = Math.min(1, p / 0.5)
  const rest = Math.max(0, (p - 0.5) / 0.5)
  const ys = layerYs(explode, scene.lite)
  const chipLift = rest * BW * CHIP_LIFT
  const v = new Vector3()
  const map = (src: Vector3[], kind: 'trace' | 'pad' | 'via' | 'pin') =>
    src.map((pt) => {
      v.copy(pt)
      if (kind === 'pin') v.y += ys.parts + (scene.lite ? chipLift : chipLift)
      else if (pt.y > 0) v.y += ys.top
      else v.y += ys.bot
      v.project(scene.camera)
      return { x: (v.x * 0.5 + 0.5) * width, y: (-v.y * 0.5 + 0.5) * height }
    })
  return {
    traces: map(scene.endsLocal.traces, 'trace'),
    pads: map(scene.endsLocal.pads, 'pad'),
    vias: map(scene.endsLocal.vias, 'via'),
    pins: map(scene.endsLocal.pins, 'pin'),
  }
}

export function disposeK1(scene: K1Scene) {
  scene.root.traverse((obj) => {
    const mesh = obj as Mesh
    if (mesh.geometry) mesh.geometry.dispose()
  })
  for (const mat of Object.values(scene.mats)) mat.dispose()
}
