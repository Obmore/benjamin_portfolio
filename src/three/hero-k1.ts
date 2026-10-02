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
  boardOutline,
  BOT_Y,
  botTraces,
  BT,
  BW,
  CAM_AZIM,
  CAM_DIST,
  CAM_ELEV,
  CHIP,
  CHIP_Y,
  chipPins,
  conn,
  FRUSTUM,
  loop,
  passives,
  poseYs,
  TOP_Y,
  topTraces,
  traceEnds,
  vias,
  type PathNode,
  type Poly,
} from './k1-layout'

export type K1Colors = { surface: Color; ink: Color; accent: Color; line: Color }

export type HeroEnd = { x: number; y: number; ax: number; ay: number }

export type K1Scene = {
  root: Group
  camera: OrthographicCamera
  frustum: number
  layers: { parts: Group; chip: Group; top: Group; sub: Group; bot: Group }
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
  endPairs: { x: number; z: number; yLocal: number; layer: 'top' | 'bot' }[]
}

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
  cam.position.set(
    CAM_DIST * Math.cos(el) * Math.sin(az),
    CAM_DIST * Math.sin(el),
    CAM_DIST * Math.cos(el) * Math.cos(az),
  )
  cam.lookAt(0, 0, 0)
  cam.updateProjectionMatrix()
  cam.updateMatrixWorld()
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function nodeY(node: PathNode, ys: ReturnType<typeof poseYs>) {
  if (node.layer === 'bot') return ys.bot + BOT_Y
  if (node.layer === 'chip') return ys.chip + CHIP_Y
  return ys.top + TOP_Y
}

function sampleLoop(u: number, ys: ReturnType<typeof poseYs>, out: Vector3) {
  const pts = loop
  const n = pts.length - 1
  const t = u * n
  const i = Math.min(n - 1, Math.floor(t))
  const f = t - i
  const a = pts[i]
  const b = pts[i + 1]
  out.set(lerp(a.x, b.x, f), lerp(nodeY(a, ys), nodeY(b, ys), f), lerp(a.z, b.z, f))
}

export function makeK1Camera() {
  const f = FRUSTUM
  const cam = new OrthographicCamera(-f, f, f, -f, 0.1, 40)
  placeCam(cam, CAM_ELEV, CAM_AZIM)
  return cam
}

export function createK1Scene(colors: K1Colors, lite: boolean): K1Scene {
  const root = new Group()
  const fill = new MeshBasicMaterial({ color: colors.surface })
  const subMat = new MeshBasicMaterial({
    color: colors.surface,
    transparent: true,
    opacity: 0.92,
    depthWrite: true,
  })
  const ink = new LineBasicMaterial({ color: colors.ink, transparent: true, opacity: 0.7 })
  const accent = new LineBasicMaterial({ color: colors.accent, transparent: true, opacity: 1 })
  const topTrace = new LineBasicMaterial({ color: colors.ink, transparent: true, opacity: 0.7 })
  const botTrace = new LineBasicMaterial({ color: colors.ink, transparent: true, opacity: 0.55 })
  const gridMat = new PointsMaterial({
    color: colors.line,
    size: 1.6,
    sizeAttenuation: false,
  })

  const parts = new Group()
  const chip = new Group()
  const top = new Group()
  const sub = new Group()
  const bot = new Group()

  const partGeos: BufferGeometry[] = [box(conn.w, conn.h, conn.d, conn.x, BT / 2 + conn.h / 2, conn.z)]
  for (const p of passives) partGeos.push(box(p.w, p.h, p.d, p.x, BT / 2 + p.h / 2, p.z))
  addMesh(parts, mergeMesh(partGeos.map((g) => g.clone())), fill)
  addLines(parts, mergeEdges(partGeos), ink)
  for (const g of partGeos) g.dispose()

  const chipGeos: BufferGeometry[] = [box(CHIP, 0.1, CHIP, 0, CHIP_Y, 0)]
  for (const p of chipPins()) chipGeos.push(box(p.w, 0.028, p.d, p.x, BT / 2 + 0.02, p.z))
  addMesh(chip, mergeMesh(chipGeos.map((g) => g.clone())), fill)
  addLines(chip, mergeEdges(chipGeos), ink)
  for (const g of chipGeos) g.dispose()

  addLines(top, polyLines([boardOutline, ...topTraces, ...allTopPads()], TOP_Y), topTrace)

  if (!lite) {
    const subGeo = box(BW, BT, BD, 0, 0, 0)
    addMesh(sub, subGeo, subMat)
    addLines(sub, new EdgesGeometry(subGeo, 20), ink)
  }

  addLines(bot, polyLines([boardOutline, ...botTraces, ...allBotPads()], BOT_Y), botTrace)

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

  root.add(bot, sub, top, parts, chip, viaLines, pulse, grid)

  const endPairs = traceEnds().map((e) => ({
    x: e.x,
    z: e.z,
    yLocal: e.layer === 'bot' ? BOT_Y : TOP_Y,
    layer: e.layer,
  }))

  const scene: K1Scene = {
    root,
    camera: makeK1Camera(),
    frustum: FRUSTUM,
    layers: { parts, chip, top, sub, bot },
    mats: { fill, sub: subMat, ink, accent, topTrace, botTrace, grid: gridMat },
    vias: viaLines,
    pulse,
    grid,
    lite,
    endPairs,
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
  const step = (28 / Math.max(px, 1)) * worldH
  const acc: number[] = []
  const limX = BW / 2 - 0.08
  const limZ = BD / 2 - 0.08
  for (let x = -limX; x <= limX + 1e-6; x += step) {
    for (let z = -limZ; z <= limZ + 1e-6; z += step) {
      acc.push(x, 0, z)
    }
  }
  scene.grid.geometry.setAttribute('position', new BufferAttribute(new Float32Array(acc), 3))
  scene.grid.geometry.computeBoundingSphere()
}

export function applyK1Progress(scene: K1Scene, p: number, pulseU: number) {
  placeCam(scene.camera, CAM_ELEV, CAM_AZIM)

  const ys = poseYs(p)
  scene.layers.top.position.y = ys.top
  scene.layers.parts.position.y = ys.parts
  scene.layers.chip.position.y = ys.chip
  scene.layers.sub.position.y = ys.sub
  scene.layers.bot.position.y = ys.bot

  scene.vias.visible = ys.explode > 0.04
  scene.mats.sub.opacity = 0.92 - 0.74 * ys.explode
  scene.mats.sub.depthWrite = ys.explode < 0.35
  const viaAttr = scene.vias.geometry.getAttribute('position')
  const va = viaAttr.array as Float32Array
  const topY = ys.top + TOP_Y
  const botY = ys.bot + BOT_Y
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

  const accentAmt = p >= 0.5 ? 1 : p / 0.5
  scene.mats.topTrace.color.lerpColors(scene.mats.ink.color, scene.mats.accent.color, accentAmt)
  scene.mats.topTrace.opacity = 0.7 + 0.3 * accentAmt
  scene.mats.accent.opacity = 0.35 + 0.65 * Math.max(accentAmt, ys.explode)

  const trail = 0.12
  const pa = scene.pulse.geometry.getAttribute('position')
  const arr = pa.array as Float32Array
  const a = new Vector3()
  const b = new Vector3()
  for (let i = 0; i < 3; i++) {
    const u0 = Math.max(0, pulseU - (trail * (i + 1)) / 3)
    const u1 = Math.max(0, pulseU - (trail * i) / 3)
    sampleLoop(u0, ys, a)
    sampleLoop(u1, ys, b)
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

export function projectEnds(scene: K1Scene, width: number, height: number): HeroEnd[] {
  scene.camera.updateMatrixWorld()
  const ve = new Vector3()
  const va = new Vector3()
  const mapPt = (v: Vector3) => {
    v.project(scene.camera)
    return { x: (v.x * 0.5 + 0.5) * width, y: (-v.y * 0.5 + 0.5) * height }
  }
  return scene.endPairs.map((rec) => {
    const ly = rec.layer === 'bot' ? scene.layers.bot.position.y : scene.layers.top.position.y
    ve.set(rec.x, rec.yLocal + ly, rec.z)
    va.set(rec.x, rec.yLocal + ly, rec.z)
    const end = mapPt(ve)
    const anc = mapPt(va)
    return { x: end.x, y: end.y, ax: anc.x, ay: anc.y }
  })
}

export function disposeK1(scene: K1Scene) {
  scene.root.traverse((obj) => {
    const mesh = obj as Mesh
    if (mesh.geometry) mesh.geometry.dispose()
  })
  for (const mat of Object.values(scene.mats)) mat.dispose()
}
