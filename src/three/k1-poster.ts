import { Vector3, type BufferGeometry, type Camera } from 'three'
import { POSTER_H, POSTER_W } from './k1-layout'
import type { K1Scene } from './hero-k1'

type Pt = { x: number; y: number }

function r(n: number) {
  return Math.round(n * 100) / 100
}

function layerOffset(a: number, u: { x: number; y: number; z: number; w: number }) {
  if (a < 0) return null
  if (a < 0.5) return u.x
  if (a < 1.5) return u.y
  if (a < 2.5) return u.z
  return u.w
}

function project(cam: Camera, x: number, y: number, z: number, w: number, h: number, out: Vector3) {
  out.set(x, y, z).project(cam)
  return {
    x: (out.x * 0.5 + 0.5) * w,
    y: (-out.y * 0.5 + 0.5) * h,
    ndcX: out.x,
    ndcY: out.y,
  }
}

function cross2(o: Pt, a: Pt, b: Pt) {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
}

function convexHull(points: Pt[]): Pt[] {
  const uniq: Pt[] = []
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y)
  for (const p of sorted) {
    const last = uniq[uniq.length - 1]
    if (last && last.x === p.x && last.y === p.y) continue
    uniq.push(p)
  }
  if (uniq.length <= 2) return uniq
  const lower: Pt[] = []
  for (const p of uniq) {
    while (lower.length >= 2 && cross2(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop()
    lower.push(p)
  }
  const upper: Pt[] = []
  for (let i = uniq.length - 1; i >= 0; i--) {
    const p = uniq[i]
    while (upper.length >= 2 && cross2(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop()
    upper.push(p)
  }
  lower.pop()
  upper.pop()
  return lower.concat(upper)
}

function attrArrays(geo: BufferGeometry) {
  const pos = geo.getAttribute('position')
  const layer = geo.getAttribute('aLayer')
  return {
    pos: pos.array as Float32Array,
    layer: layer ? (layer.array as Float32Array) : null,
    count: pos.count,
    index: geo.index ? (geo.index.array as ArrayLike<number>) : null,
  }
}

function linePaths(
  geo: BufferGeometry,
  u: { x: number; y: number; z: number; w: number },
  cam: Camera,
  w: number,
  h: number,
  want: (layer: number) => boolean,
) {
  const { pos, layer, count } = attrArrays(geo)
  if (!layer) return ''
  const v = new Vector3()
  const parts: string[] = []
  for (let i = 0; i < count; i += 2) {
    const la = layer[i]
    const lb = layer[i + 1]
    if (!want(la) && !want(lb)) continue
    const oyA = layerOffset(la, u)
    const oyB = layerOffset(lb, u)
    if (oyA === null || oyB === null) continue
    const a = project(cam, pos[i * 3], pos[i * 3 + 1] + oyA, pos[i * 3 + 2], w, h, v)
    const b = project(cam, pos[(i + 1) * 3], pos[(i + 1) * 3 + 1] + oyB, pos[(i + 1) * 3 + 2], w, h, v)
    parts.push(`M${r(a.x)},${r(a.y)}L${r(b.x)},${r(b.y)}`)
  }
  return parts.join('')
}

function fillPaths(
  geo: BufferGeometry,
  u: { x: number; y: number; z: number; w: number },
  cam: Camera,
  w: number,
  h: number,
  want: (layer: number) => boolean,
) {
  const { pos, layer, count, index } = attrArrays(geo)
  const v = new Vector3()
  const parts: string[] = []
  const triCount = index ? index.length / 3 : count / 3
  for (let t = 0; t < triCount; t++) {
    const ia = index ? (index[t * 3] as number) : t * 3
    const ib = index ? (index[t * 3 + 1] as number) : t * 3 + 1
    const ic = index ? (index[t * 3 + 2] as number) : t * 3 + 2
    const la = layer ? layer[ia] : 0
    if (!want(la)) continue
    const oy = layerOffset(la, u)
    if (oy === null) continue
    const a = project(cam, pos[ia * 3], pos[ia * 3 + 1] + oy, pos[ia * 3 + 2], w, h, v)
    const b = project(cam, pos[ib * 3], pos[ib * 3 + 1] + oy, pos[ib * 3 + 2], w, h, v)
    const c = project(cam, pos[ic * 3], pos[ic * 3 + 1] + oy, pos[ic * 3 + 2], w, h, v)
    const area = (b.ndcX - a.ndcX) * (c.ndcY - a.ndcY) - (b.ndcY - a.ndcY) * (c.ndcX - a.ndcX)
    if (area <= 1e-8) continue
    parts.push(`M${r(a.x)},${r(a.y)}L${r(b.x)},${r(b.y)}L${r(c.x)},${r(c.y)}Z`)
  }
  return parts.join('')
}

function hullPath(
  geo: BufferGeometry,
  u: { x: number; y: number; z: number; w: number },
  cam: Camera,
  w: number,
  h: number,
) {
  const { pos, layer, count } = attrArrays(geo)
  const v = new Vector3()
  const pts: Pt[] = []
  for (let i = 0; i < count; i++) {
    const oy = layerOffset(layer ? layer[i] : 1, u)
    if (oy === null) continue
    const p = project(cam, pos[i * 3], pos[i * 3 + 1] + oy, pos[i * 3 + 2], w, h, v)
    pts.push({ x: r(p.x), y: r(p.y) })
  }
  const hull = convexHull(pts)
  if (hull.length < 3) return ''
  return `${hull.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join('')}Z`
}

export function svgFromK1Scene(scene: K1Scene, w = POSTER_W, h = POSTER_H) {
  scene.camera.updateProjectionMatrix()
  scene.camera.updateMatrixWorld()
  const u = scene.uLayerY.value
  const cam = scene.camera
  const ink = scene.ink.geometry
  const accent = scene.accent.geometry
  const fill = scene.fill.geometry
  const sub = scene.subMesh?.geometry ?? null

  const ink0 = linePaths(ink, u, cam, w, h, (l) => l >= 0 && l < 0.5)
  const ink1 = linePaths(ink, u, cam, w, h, (l) => l >= 0.5 && l < 1.5)
  const ink2 = linePaths(ink, u, cam, w, h, (l) => l >= 1.5 && l < 2.5)
  const ink3 = linePaths(ink, u, cam, w, h, (l) => l >= 2.5)
  const acc = linePaths(accent, u, cam, w, h, (l) => l >= 0)
  const fill2 = fillPaths(fill, u, cam, w, h, (l) => l >= 1.5 && l < 2.5)
  const fill3 = fillPaths(fill, u, cam, w, h, (l) => l >= 2.5)
  const subPath = sub ? hullPath(sub, u, cam, w, h) : ''

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" class="hero-3d-poster" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" fill="none" aria-hidden="true" focusable="false" data-pose="100">`,
    `<style>.hero-3d-poster .k1-ink{stroke:var(--color-ink);stroke-opacity:.55;stroke-width:1;stroke-linejoin:round;fill:none}html[data-theme=dark] .hero-3d-poster .k1-ink{stroke-opacity:.7}.hero-3d-poster .k1-accent{stroke:var(--color-accent);stroke-opacity:1;stroke-width:1;stroke-linecap:round;stroke-linejoin:round;fill:none}.hero-3d-poster .k1-fill{fill:var(--color-surface);stroke:none}.hero-3d-poster .k1-sub{fill:var(--color-surface);fill-opacity:.18;stroke:none}html[data-theme=dark] .hero-3d-poster .k1-sub{fill-opacity:.18}</style>`,
    ink0 ? `<path class="k1-ink" d="${ink0}"/>` : '',
    subPath ? `<path class="k1-sub" d="${subPath}"/>` : '',
    ink1 ? `<path class="k1-ink" d="${ink1}"/>` : '',
    fill2 ? `<path class="k1-fill" d="${fill2}"/>` : '',
    ink2 ? `<path class="k1-ink" d="${ink2}"/>` : '',
    acc ? `<path class="k1-accent" d="${acc}"/>` : '',
    fill3 ? `<path class="k1-fill" d="${fill3}"/>` : '',
    ink3 ? `<path class="k1-ink" d="${ink3}"/>` : '',
    `</svg>`,
  ]
    .filter(Boolean)
    .join('')
}
