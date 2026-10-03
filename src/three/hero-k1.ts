import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  Scene,
  Vector3,
  Vector4,
  WebGLRenderer,
} from 'three'
import {
  allAnchors,
  allBotPads,
  allTopPads,
  anchorById,
  BD,
  boardOutline,
  BOT_Y,
  botTraces,
  boxEdges,
  BT,
  BW,
  CAM_AZIM,
  CAM_DIST,
  CAM_ELEV,
  CHIP,
  CHIP_Y,
  conn,
  FRUSTUM,
  loop,
  passives,
  POSTER_H,
  POSTER_W,
  poseYs,
  TOP_Y,
  topFaceEdges,
  topTraces,
  traceEnds,
  vias,
  type Anchor,
  type PathNode,
  type Poly,
} from './k1-layout'

export type K1Colors = { surface: Color; ink: Color; accent: Color; line: Color }

export { Color, Scene, WebGLRenderer, POSTER_W, POSTER_H }

export const POSTER_ASPECT = POSTER_W / POSTER_H

export type HeroEnd = {
  x: number
  y: number
  ax: number
  ay: number
  id: string
  targetId: string
  kind: 'pad' | 'via' | 'pin'
}

type LayerShaderMat = MeshBasicMaterial | LineBasicMaterial

export type K1Scene = {
  root: Group
  carrier: Group
  camera: OrthographicCamera
  frustum: number
  mats: {
    fill: MeshBasicMaterial
    sub: MeshBasicMaterial
    ink: LineBasicMaterial
    accent: LineBasicMaterial
  }
  fill: Mesh
  ink: LineSegments
  accent: LineSegments
  subMesh: Mesh | null
  uLayerY: { value: Vector4 }
  tokens: { ink: Color; accent: Color }
  dark: boolean
  lite: boolean
  pulseOffset: number
  anchors: Anchor[]
  endPairs: { x: number; z: number; layer: 'top' | 'bot'; id: string; px?: number; py?: number }[]
}

const LY = { bot: 0, sub: 1, top: 2, chip: 3 }

type LineBuf = { pos: number[]; layer: number[] }

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function bindLayer(mat: LayerShaderMat, uLayerY: { value: Vector4 }) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uLayerY = uLayerY
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aLayer;\nuniform vec4 uLayerY;')
      .replace(
        '#include <begin_vertex>',
        [
          '#include <begin_vertex>',
          'transformed.y += aLayer < 0.0 ? 0.0 : aLayer < 0.5 ? uLayerY.x : aLayer < 1.5 ? uLayerY.y : aLayer < 2.5 ? uLayerY.z : uLayerY.w;',
        ].join('\n'),
      )
  }
  mat.customProgramCacheKey = () => 'k1y'
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

function addPolys(buf: LineBuf, polys: readonly Poly[], y: number, layer: number) {
  for (const poly of polys) {
    for (let i = 0; i < poly.length - 1; i++) {
      const a = poly[i]
      const b = poly[i + 1]
      buf.pos.push(a[0], y, a[1], b[0], y, b[1])
      buf.layer.push(layer, layer)
    }
  }
}

function addEdges(
  buf: LineBuf,
  edges: readonly (readonly (readonly [number, number, number])[])[],
  layer: number,
) {
  for (const [a, b] of edges) {
    buf.pos.push(a[0], a[1], a[2], b[0], b[1], b[2])
    buf.layer.push(layer, layer)
  }
}

function lineGeometry(buf: LineBuf) {
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(buf.pos), 3))
  g.setAttribute('aLayer', new BufferAttribute(new Float32Array(buf.layer), 1))
  return g
}

function taggedBox(w: number, h: number, d: number, x: number, y: number, z: number, layer: number) {
  const g = new BoxGeometry(w, h, d)
  g.translate(x, y, z)
  const n = g.getAttribute('position').count
  g.setAttribute('aLayer', new BufferAttribute(new Float32Array(n).fill(layer), 1))
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
  const layer = new Float32Array(vc)
  const idx = new Uint32Array(ic)
  let po = 0
  let lo = 0
  let io = 0
  let vo = 0
  for (const g of geos) {
    const p = g.getAttribute('position')
    pos.set(p.array as Float32Array, po)
    const la = g.getAttribute('aLayer')
    if (la) layer.set(la.array as Float32Array, lo)
    if (g.index) {
      const a = g.index.array
      for (let i = 0; i < a.length; i++) idx[io++] = (a[i] as number) + vo
    }
    po += p.count * 3
    lo += p.count
    vo += p.count
    g.dispose()
  }
  const out = new BufferGeometry()
  out.setAttribute('position', new BufferAttribute(pos, 3))
  out.setAttribute('aLayer', new BufferAttribute(layer, 1))
  out.setIndex(new BufferAttribute(idx, 1))
  return out
}

function worldY(scene: K1Scene, layer: 'top' | 'bot') {
  const v = scene.uLayerY.value
  const local = layer === 'bot' ? BOT_Y : TOP_Y
  return layer === 'bot' ? v.x + local : v.z + local
}

export async function createK1Scene(
  colors: K1Colors,
  lite: boolean,
  pause: () => Promise<void> = () => Promise.resolve(),
): Promise<K1Scene> {
  const uLayerY = { value: new Vector4(0, 0, 0, 0) }
  const fill = new MeshBasicMaterial({
    color: colors.surface,
    transparent: false,
    depthWrite: true,
    depthTest: true,
    polygonOffset: true,
    polygonOffsetFactor: 8,
    polygonOffsetUnits: 8,
  })
  const subMat = new MeshBasicMaterial({
    color: colors.surface,
    transparent: true,
    opacity: 0.92,
    depthWrite: true,
    depthTest: true,
    polygonOffset: true,
    polygonOffsetFactor: 8,
    polygonOffsetUnits: 8,
  })
  const ink = new LineBasicMaterial({
    color: colors.ink,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    depthTest: true,
  })
  const accent = new LineBasicMaterial({
    color: colors.ink,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    depthTest: true,
  })
  bindLayer(fill, uLayerY)
  bindLayer(subMat, uLayerY)
  bindLayer(ink, uLayerY)
  bindLayer(accent, uLayerY)

  const root = new Group()
  const carrier = new Group()

  await pause()

  const topY = TOP_Y
  const botY = BOT_Y

  const fillGeos = [
    taggedBox(conn.w, conn.h, conn.d, conn.x, BT / 2 + conn.h / 2, conn.z, LY.top),
    ...passives.map((p) => taggedBox(p.w, p.h, p.d, p.x, BT / 2 + p.h / 2, p.z, LY.top)),
    taggedBox(CHIP, 0.1, CHIP, 0, CHIP_Y, 0, LY.chip),
  ]
  await pause()
  const fillMesh = new Mesh(mergeMesh(fillGeos), fill)
  fillMesh.frustumCulled = false
  fillMesh.renderOrder = -1

  await pause()

  const inkBuf: LineBuf = { pos: [], layer: [] }
  addPolys(inkBuf, [boardOutline], botY, LY.bot)
  addPolys(inkBuf, [...botTraces, ...allBotPads()], botY, LY.bot)
  await pause()
  addPolys(inkBuf, [boardOutline], 0, LY.sub)
  await pause()
  addPolys(inkBuf, [boardOutline], topY, LY.top)
  addEdges(inkBuf, boxEdges(conn.w, conn.h, conn.d, conn.x, BT / 2 + conn.h / 2, conn.z), LY.top)
  for (const p of passives) {
    addEdges(inkBuf, boxEdges(p.w, p.h, p.d, p.x, BT / 2 + p.h / 2, p.z), LY.top)
  }
  addEdges(inkBuf, topFaceEdges(CHIP, 0.1, CHIP, 0, CHIP_Y + 0.006, 0), LY.chip)
  await pause()
  const inkLines = new LineSegments(lineGeometry(inkBuf), ink)
  inkLines.frustumCulled = false
  inkLines.renderOrder = 2

  await pause()

  const accentBuf: LineBuf = { pos: [], layer: [] }
  addPolys(accentBuf, [...topTraces, ...allTopPads()], topY, LY.top)
  await pause()
  for (const [x, z] of vias) {
    accentBuf.pos.push(x, topY, z, x, botY, z)
    accentBuf.layer.push(LY.top, LY.bot)
  }
  const pulseOffset = accentBuf.pos.length
  for (let i = 0; i < 6; i++) {
    accentBuf.pos.push(0, 0, 0)
    accentBuf.layer.push(-1)
  }
  await pause()
  const accentLines = new LineSegments(lineGeometry(accentBuf), accent)
  accentLines.frustumCulled = false
  accentLines.renderOrder = 3

  await pause()

  let subMesh: Mesh | null = null
  if (!lite) {
    const subGeo = taggedBox(BW, BT, BD, 0, 0, 0, LY.sub)
    subMesh = new Mesh(subGeo, subMat)
    subMesh.frustumCulled = false
    subMesh.renderOrder = -1
    carrier.add(subMesh)
  }

  root.add(fillMesh, inkLines, accentLines, carrier)
  await pause()

  const scene: K1Scene = {
    root,
    carrier,
    camera: makeK1Camera(),
    frustum: FRUSTUM,
    mats: { fill, sub: subMat, ink, accent },
    fill: fillMesh,
    ink: inkLines,
    accent: accentLines,
    subMesh,
    uLayerY,
    tokens: { ink: colors.ink.clone(), accent: colors.accent.clone() },
    dark: false,
    lite,
    pulseOffset,
    anchors: allAnchors(),
    endPairs: traceEnds(),
  }
  applyK1Progress(scene, 0, 0)
  return scene
}

export function setK1Colors(scene: K1Scene, colors: K1Colors, dark = false) {
  scene.tokens.ink.copy(colors.ink)
  scene.tokens.accent.copy(colors.accent)
  scene.dark = dark
  scene.mats.fill.color.copy(colors.surface)
  scene.mats.sub.color.copy(colors.surface)
  scene.mats.ink.color.copy(colors.ink)
}

export function setK1Aspect(scene: K1Scene, aspect = POSTER_ASPECT) {
  const f = scene.frustum
  scene.camera.left = -f * aspect
  scene.camera.right = f * aspect
  scene.camera.top = f
  scene.camera.bottom = -f
  scene.camera.updateProjectionMatrix()
}

export function applyK1Progress(scene: K1Scene, p: number, pulseU: number) {
  placeCam(scene.camera, CAM_ELEV, CAM_AZIM)
  const ys = poseYs(p)
  scene.uLayerY.value.set(ys.bot, ys.sub, ys.top, ys.chip)

  if (scene.subMesh) {
    scene.mats.sub.opacity = 0.92 - 0.74 * ys.explode
    scene.mats.sub.depthWrite = ys.explode < 0.35
  }

  const accentAmt = p >= 0.5 ? 1 : p / 0.5
  if (scene.dark) {
    scene.mats.ink.opacity = 0.7
    scene.mats.accent.color.lerpColors(scene.tokens.ink, scene.tokens.accent, accentAmt)
    scene.mats.accent.opacity = 0.35 + 0.65 * Math.max(accentAmt, ys.explode)
  } else {
    scene.mats.ink.opacity = 0.55
    scene.mats.ink.color.copy(scene.tokens.ink)
    if (p >= 0.5) {
      scene.mats.accent.color.copy(scene.tokens.accent)
      scene.mats.accent.opacity = 1
    } else {
      scene.mats.accent.color.copy(scene.tokens.ink)
      scene.mats.accent.opacity = 0.55
    }
  }

  const pa = scene.accent.geometry.getAttribute('position')
  const arr = pa.array as Float32Array
  const a = new Vector3()
  const b = new Vector3()
  const trail = 0.12
  const base = scene.pulseOffset
  for (let i = 0; i < 3; i++) {
    const u0 = Math.max(0, pulseU - (trail * (i + 1)) / 3)
    const u1 = Math.max(0, pulseU - (trail * i) / 3)
    sampleLoop(u0, ys, a)
    sampleLoop(u1, ys, b)
    const o = base + i * 6
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
    const y = worldY(scene, rec.layer)
    ve.set(rec.x, y, rec.z)
    const end = mapPt(ve)
    const anc = anchorById(rec.id, rec.layer, scene.anchors)
    if (!anc) {
      return {
        x: end.x + (rec.px ?? 0),
        y: end.y + (rec.py ?? 0),
        ax: end.x + 99,
        ay: end.y + 99,
        id: rec.id,
        targetId: rec.id,
        kind: 'pad' as const,
      }
    }
    va.set(anc.x, worldY(scene, anc.layer), anc.z)
    const a = mapPt(va)
    return {
      x: end.x + (rec.px ?? 0),
      y: end.y + (rec.py ?? 0),
      ax: a.x,
      ay: a.y,
      id: anc.id,
      targetId: rec.id,
      kind: anc.kind,
    }
  })
}

export function measureK1Layers(scene: K1Scene) {
  let n = 0
  if (scene.fill) n += 1
  if (scene.ink) n += 1
  if (scene.accent) n += 1
  if (scene.subMesh) n += 1
  return n
}

export function disposeK1(scene: K1Scene) {
  scene.root.traverse((obj) => {
    const mesh = obj as Mesh
    if (mesh.geometry) mesh.geometry.dispose()
  })
  for (const mat of Object.values(scene.mats)) mat.dispose()
}
