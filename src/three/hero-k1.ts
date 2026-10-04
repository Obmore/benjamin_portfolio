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
  NoBlending,
  NormalBlending,
  OrthographicCamera,
  Scene,
  ShaderMaterial,
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
  topRoutes,
  botRoutes,
  vias,
  type Anchor,
  type PathNode,
  type Poly,
} from './k1-layout'

export type K1Colors = { surface: Color; ink: Color; accent: Color; line: Color }

export { Color, Scene, WebGLRenderer, Mesh, BoxGeometry, MeshBasicMaterial, Vector3, POSTER_W, POSTER_H }

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

export type K1Scene = {
  root: Group
  carrier: Group
  camera: OrthographicCamera
  frustum: number
  mats: {
    fill: ShaderMaterial
    sub: ShaderMaterial
    lid: ShaderMaterial
    ink: LineBasicMaterial
    accent: LineBasicMaterial
    body: LineBasicMaterial
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
  endPairs: { x: number; z: number; layer: 'top' | 'bot'; id: string; wy?: number }[]
  endVerts: { which: 'ink' | 'accent'; vert: number }[]
}

const LY = { bot: 0, sub: 1, top: 2, chip: 3 }

type LineBuf = { pos: number[]; layer: number[] }

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

type LayerShaderMat = LineBasicMaterial

function bindLayer(mat: LayerShaderMat, uLayerY: { value: Vector4 }, key: string) {
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
  mat.customProgramCacheKey = () => key
}

const FILL_VERT = [
  'attribute float aLayer;',
  'uniform vec4 uLayerY;',
  'void main() {',
  '  vec3 transformed = vec3(position);',
  '  transformed.y += aLayer < 0.0 ? 0.0 : aLayer < 0.5 ? uLayerY.x : aLayer < 1.5 ? uLayerY.y : aLayer < 2.5 ? uLayerY.z : uLayerY.w;',
  '  gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);',
  '}',
].join('\n')

const FILL_FRAG = [
  'uniform vec3 uColor;',
  'uniform float uOpacity;',
  'void main() {',
  '  gl_FragColor = vec4(uColor, uOpacity);',
  '#include <colorspace_fragment>',
  '}',
].join('\n')

function makeFillMat(
  color: Color,
  uLayerY: { value: Vector4 },
  transparent: boolean,
  opacity: number,
) {
  const uColor = color.clone()
  const mat = new ShaderMaterial({
    uniforms: {
      uLayerY,
      uColor: { value: uColor },
      uOpacity: { value: opacity },
    },
    vertexShader: FILL_VERT,
    fragmentShader: FILL_FRAG,
    transparent,
    depthWrite: !transparent,
    depthTest: true,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
    blending: opacity >= 0.999 ? NoBlending : NormalBlending,
  })
  Object.defineProperty(mat, 'color', {
    configurable: true,
    get() {
      return uColor
    },
    set(next: Color) {
      uColor.copy(next)
    },
  })
  return mat
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
  if (node.layer === 'chip') return ys.top + CHIP_Y
  return ys.top + TOP_Y
}

const _pulseA = new Vector3()
const _pulseB = new Vector3()

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

function addFacingEdges(buf: LineBuf, geo: BufferGeometry, layer: number, oy: number) {
  const pos = geo.getAttribute('position')
  const idx = geo.index
  if (!idx) return
  const arr = pos.array as Float32Array
  const ia = idx.array
  const el = (CAM_ELEV * Math.PI) / 180
  const az = (CAM_AZIM * Math.PI) / 180
  const cx = CAM_DIST * Math.cos(el) * Math.sin(az)
  const cy = CAM_DIST * Math.sin(el)
  const cz = CAM_DIST * Math.cos(el) * Math.cos(az)
  const faces = new Map<string, { nx: number; ny: number; nz: number; front: boolean }[]>()
  const keyOf = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`)
  for (let t = 0; t < idx.count / 3; t++) {
    const a = ia[t * 3] as number
    const b = ia[t * 3 + 1] as number
    const c = ia[t * 3 + 2] as number
    const ax = arr[a * 3]
    const ay = arr[a * 3 + 1] + oy
    const azw = arr[a * 3 + 2]
    const bx = arr[b * 3]
    const by = arr[b * 3 + 1] + oy
    const bz = arr[b * 3 + 2]
    const dx = arr[c * 3]
    const dy = arr[c * 3 + 1] + oy
    const dz = arr[c * 3 + 2]
    const nx = (by - ay) * (dz - azw) - (bz - azw) * (dy - ay)
    const ny = (bz - azw) * (dx - ax) - (bx - ax) * (dz - azw)
    const nz = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax)
    const mx = (ax + bx + dx) / 3
    const my = (ay + by + dy) / 3
    const mz = (azw + bz + dz) / 3
    const face = {
      nx,
      ny,
      nz,
      front: nx * (cx - mx) + ny * (cy - my) + nz * (cz - mz) > 0,
    }
    for (const pair of [
      [a, b],
      [b, c],
      [c, a],
    ] as const) {
      const k = keyOf(pair[0], pair[1])
      const list = faces.get(k)
      if (list) list.push(face)
      else faces.set(k, [face])
    }
  }
  for (const [k, list] of faces) {
    if (!list.some((f) => f.front)) continue
    if (list.length >= 2) {
      const fa = list[0]
      const fb = list[1]
      const mag = Math.hypot(fa.nx, fa.ny, fa.nz) * Math.hypot(fb.nx, fb.ny, fb.nz) || 1
      if ((fa.nx * fb.nx + fa.ny * fb.ny + fa.nz * fb.nz) / mag > 0.94) continue
    }
    const dash = k.indexOf('-')
    const i0 = Number(k.slice(0, dash))
    const i1 = Number(k.slice(dash + 1))
    buf.pos.push(arr[i0 * 3], arr[i0 * 3 + 1], arr[i0 * 3 + 2], arr[i1 * 3], arr[i1 * 3 + 1], arr[i1 * 3 + 2])
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
  const fill = makeFillMat(colors.surface, uLayerY, false, 1)
  const subMat = makeFillMat(colors.surface, uLayerY, true, 0.92)
  const lidMat = makeFillMat(colors.surface, uLayerY, true, 1)
  const ink = new LineBasicMaterial({
    color: colors.ink,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    depthTest: true,
    polygonOffset: false,
  })
  const accent = new LineBasicMaterial({
    color: colors.ink,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    depthTest: true,
    polygonOffset: false,
  })
  bindLayer(ink, uLayerY, 'k1y-ink')
  bindLayer(accent, uLayerY, 'k1y-accent')
  const bodyMat = new LineBasicMaterial({
    color: colors.ink,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    depthTest: false,
    polygonOffset: false,
  })
  bindLayer(bodyMat, uLayerY, 'k1y-body')

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

  const inkBuf: LineBuf = { pos: [], layer: [] }
  const bodyBuf: LineBuf = { pos: [], layer: [] }
  const ys1 = poseYs(1)
  for (const g of fillGeos) {
    const la = g.getAttribute('aLayer')
    const layer = la ? (la.array as Float32Array)[0] : LY.top
    addFacingEdges(bodyBuf, g, layer, layer >= 2.5 ? ys1.chip : ys1.top)
  }
  const fillMesh = new Mesh(mergeMesh(fillGeos), fill)
  fillMesh.frustumCulled = false
  fillMesh.renderOrder = -1
  fillMesh.userData.layer = 'fill'

  const lid = new Mesh(taggedBox(CHIP, 0.002, CHIP, 0, CHIP_Y + 0.05, 0, LY.chip), lidMat)
  lid.frustumCulled = false
  lid.renderOrder = 5

  await pause()

  const endPairs: K1Scene['endPairs'] = []
  const endVerts: K1Scene['endVerts'] = []
  const addRoute = (
    route: (typeof topRoutes)[number],
    y: number,
    layer: number,
    layerName: 'top' | 'bot',
  ) => {
    const startVert = inkBuf.pos.length / 3
    addPolys(inkBuf, [route.poly], y, layer)
    const endVert = inkBuf.pos.length / 3 - 1
    const first = route.poly[0]
    const last = route.poly[route.poly.length - 1]
    endPairs.push({ x: first[0], z: first[1], layer: layerName, id: route.startId })
    endVerts.push({ which: 'ink', vert: startVert })
    endPairs.push({ x: last[0], z: last[1], layer: layerName, id: route.endId })
    endVerts.push({ which: 'ink', vert: endVert })
  }

  addPolys(inkBuf, [boardOutline], botY, LY.bot)
  addPolys(inkBuf, allBotPads(), botY, LY.bot)
  await pause()
  addPolys(inkBuf, [boardOutline], 0, LY.sub)
  await pause()
  addPolys(inkBuf, [boardOutline], topY, LY.top)
  addPolys(inkBuf, allTopPads(), topY, LY.top)
  for (const route of topRoutes) addRoute(route, topY, LY.top, 'top')
  for (const route of botRoutes) addRoute(route, botY, LY.bot, 'bot')
  await pause()
  const inkLines = new LineSegments(lineGeometry(inkBuf), ink)
  inkLines.frustumCulled = false
  inkLines.renderOrder = 1
  inkLines.userData.layer = 'ink'

  await pause()

  const accentBuf: LineBuf = { pos: [], layer: [] }
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
  accentLines.renderOrder = 2
  accentLines.userData.layer = 'accent'

  await pause()

  let subMesh: Mesh | null = null
  if (!lite) {
    const subGeo = taggedBox(BW, BT, BD, 0, 0, 0, LY.sub)
    subMesh = new Mesh(subGeo, subMat)
    subMesh.frustumCulled = false
    subMesh.renderOrder = 0
    subMesh.userData.layer = 'sub'
    carrier.userData.layer = 'sub'
    carrier.add(subMesh)
  }

  const bodyLines = new LineSegments(lineGeometry(bodyBuf), bodyMat)
  bodyLines.frustumCulled = false
  bodyLines.renderOrder = 6

  root.add(fillMesh, inkLines, accentLines, lid, bodyLines)
  if (subMesh) root.add(carrier)
  await pause()

  const scene: K1Scene = {
    root,
    carrier,
    camera: makeK1Camera(),
    frustum: FRUSTUM,
    mats: { fill, sub: subMat, lid: lidMat, ink, accent, body: bodyMat },
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
    endPairs,
    endVerts,
  }
  applyK1Progress(scene, 0, 0)
  return scene
}

export function setK1Colors(scene: K1Scene, colors: K1Colors, dark = false) {
  scene.tokens.ink.copy(colors.ink)
  scene.tokens.accent.copy(colors.accent)
  scene.dark = dark
  ;(scene.mats.fill.uniforms.uColor.value as Color).copy(colors.surface)
  ;(scene.mats.sub.uniforms.uColor.value as Color).copy(colors.surface)
  ;(scene.mats.lid.uniforms.uColor.value as Color).copy(colors.surface)
  scene.mats.ink.color.copy(colors.ink)
  scene.mats.body.color.copy(colors.ink)
  scene.mats.accent.color.copy(colors.accent)
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
  const ys = poseYs(p)
  scene.uLayerY.value.set(ys.bot, ys.sub, ys.top, ys.chip)

  if (scene.subMesh) {
    const op = 0.92 - 0.74 * ys.explode
    scene.mats.sub.uniforms.uOpacity.value = op
    scene.mats.sub.depthWrite = ys.explode < 0.35
  }

  scene.mats.ink.opacity = scene.dark ? 0.7 : 0.55
  scene.mats.body.opacity = scene.mats.ink.opacity
  scene.mats.accent.color.copy(scene.tokens.accent)
  scene.mats.accent.opacity = 1

  const pa = scene.accent.geometry.getAttribute('position')
  const arr = pa.array as Float32Array
  const trail = 0.12
  const base = scene.pulseOffset
  const pulseLim = 1 - 1 / Math.max(1, loop.length - 1)
  const uPulse = Math.min(pulseU, pulseLim)
  for (let i = 0; i < 3; i++) {
    let u0 = Math.max(0, uPulse - (trail * (i + 1)) / 3)
    let u1 = Math.max(0, uPulse - (trail * i) / 3)
    if (uPulse <= 1e-6 && i === 0) {
      u0 = 0
      u1 = 0.06
    }
    sampleLoop(u0, ys, _pulseA)
    sampleLoop(u1, ys, _pulseB)
    const o = base + i * 6
    arr[o] = _pulseA.x
    arr[o + 1] = _pulseA.y
    arr[o + 2] = _pulseA.z
    arr[o + 3] = _pulseB.x
    arr[o + 4] = _pulseB.y
    arr[o + 5] = _pulseB.z
  }
  pa.needsUpdate = true
}

export function shiftK1EndByPx(scene: K1Scene, index: number, px: number, width: number) {
  const rec = scene.endPairs[index]
  const vert = scene.endVerts[index]
  if (!rec || !vert || width <= 0) return
  const cam = scene.camera
  cam.updateMatrixWorld()
  const y = rec.wy ?? worldY(scene, rec.layer)
  const from = new Vector3(rec.x, y, rec.z)
  const ndc = from.clone().project(cam)
  ndc.x += (px / width) * 2
  const to = ndc.unproject(cam)
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dz = to.z - from.z
  rec.x += dx
  rec.z += dz
  rec.wy = y + dy
  const mesh = vert.which === 'ink' ? scene.ink : scene.accent
  const pos = mesh.geometry.getAttribute('position')
  const arr = pos.array as Float32Array
  const o = vert.vert * 3
  arr[o] += dx
  arr[o + 1] += dy
  arr[o + 2] += dz
  pos.needsUpdate = true
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
    const y = rec.wy ?? worldY(scene, rec.layer)
    ve.set(rec.x, y, rec.z)
    const end = mapPt(ve)
    const anc = anchorById(rec.id, rec.layer, scene.anchors)
    if (!anc) {
      return {
        x: end.x,
        y: end.y,
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
      x: end.x,
      y: end.y,
      ax: a.x,
      ay: a.y,
      id: anc.id,
      targetId: rec.id,
      kind: anc.kind,
    }
  })
}

export function disposeK1(scene: K1Scene) {
  scene.root.traverse((obj) => {
    const mesh = obj as Mesh
    if (mesh.geometry) mesh.geometry.dispose()
  })
  for (const mat of Object.values(scene.mats)) mat.dispose()
}
