import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as THREE from 'three'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const genDir = path.join(root, 'src/three/generated')
const posterDir = path.join(root, 'public/3d')
const FORBIDDEN = [/\brollin\b/i, /get in touch/i]

const FRUSTUM = 1.35
const ELEV = 30 * (Math.PI / 180)
const AZIM = 45 * (Math.PI / 180)

function camera() {
  const cam = new THREE.OrthographicCamera(-FRUSTUM, FRUSTUM, FRUSTUM, -FRUSTUM, 0.1, 40)
  const d = 12
  cam.position.set(
    d * Math.cos(ELEV) * Math.sin(AZIM),
    d * Math.sin(ELEV),
    d * Math.cos(ELEV) * Math.cos(AZIM),
  )
  cam.lookAt(0, 0, 0)
  cam.updateMatrixWorld()
  cam.updateProjectionMatrix()
  return cam
}

/** @typedef {{ i: number[], b: number[], d: number[] }} LayerBuf */

function emptyLayer() {
  return { i: [], b: [], d: [] }
}

function pushEdges(target, geometry, matrix) {
  const edges = new THREE.EdgesGeometry(geometry, 18)
  edges.applyMatrix4(matrix)
  const pos = edges.attributes.position
  for (let i = 0; i < pos.count; i++) {
    target.push(pos.getX(i), pos.getY(i), pos.getZ(i))
  }
  geometry.dispose()
  edges.dispose()
}

function addBox(target, w, h, d, x, y, z) {
  const g = new THREE.BoxGeometry(w, h, d)
  const m = new THREE.Matrix4().makeTranslation(x, y, z)
  pushEdges(target, g, m)
}

function addCyl(target, rTop, rBot, h, segs, x, y, z, axis = 'y') {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, segs)
  const rot = new THREE.Matrix4()
  if (axis === 'x') rot.makeRotationZ(Math.PI / 2)
  if (axis === 'z') rot.makeRotationX(Math.PI / 2)
  const m = new THREE.Matrix4().makeTranslation(x, y, z).multiply(rot)
  pushEdges(target, g, m)
}

function allPoints(layers) {
  const pts = []
  for (const layer of layers) {
    pts.push(...layer.i, ...layer.b, ...layer.d)
  }
  return pts
}

function fit(layers, size = 1.7) {
  const pts = allPoints(layers)
  let minX = Infinity
  let minY = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let maxZ = -Infinity
  for (let i = 0; i < pts.length; i += 3) {
    minX = Math.min(minX, pts[i])
    minY = Math.min(minY, pts[i + 1])
    minZ = Math.min(minZ, pts[i + 2])
    maxX = Math.max(maxX, pts[i])
    maxY = Math.max(maxY, pts[i + 1])
    maxZ = Math.max(maxZ, pts[i + 2])
  }
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const cz = (minZ + maxZ) / 2
  const span = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 1e-6)
  const s = size / span
  const shift = (arr) => {
    for (let i = 0; i < arr.length; i += 3) {
      arr[i] = (arr[i] - cx) * s
      arr[i + 1] = (arr[i + 1] - cy) * s
      arr[i + 2] = (arr[i + 2] - cz) * s
    }
  }
  for (const layer of layers) {
    shift(layer.i)
    shift(layer.b)
    shift(layer.d)
  }
}

function quantize(arr) {
  if (arr.length === 0) return undefined
  let minX = Infinity
  let minY = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let maxZ = -Infinity
  for (let i = 0; i < arr.length; i += 3) {
    minX = Math.min(minX, arr[i])
    minY = Math.min(minY, arr[i + 1])
    minZ = Math.min(minZ, arr[i + 2])
    maxX = Math.max(maxX, arr[i])
    maxY = Math.max(maxY, arr[i + 1])
    maxZ = Math.max(maxZ, arr[i + 2])
  }
  const span = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 1e-6)
  const s = span / 32767
  const o = [minX, minY, minZ]
  const i16 = new Int16Array(arr.length)
  for (let i = 0; i < arr.length; i += 3) {
    i16[i] = Math.round((arr[i] - o[0]) / s)
    i16[i + 1] = Math.round((arr[i + 1] - o[1]) / s)
    i16[i + 2] = Math.round((arr[i + 2] - o[2]) / s)
  }
  const b64 = Buffer.from(i16.buffer).toString('base64')
  return { p: b64, s, o, count: arr.length / 3 }
}

function dequant(q) {
  const buf = Buffer.from(q.p, 'base64')
  const src = new Int16Array(buf.buffer, buf.byteOffset, buf.byteLength / 2)
  const out = new Float32Array(src.length)
  for (let i = 0; i < src.length; i += 3) {
    out[i] = src[i] * q.s + q.o[0]
    out[i + 1] = src[i + 1] * q.s + q.o[1]
    out[i + 2] = src[i + 2] * q.s + q.o[2]
  }
  return out
}

function project(cam, x, y, z) {
  const v = new THREE.Vector3(x, y, z).project(cam)
  return [(v.x + 1) * 50, (1 - v.y) * 50]
}

function linesToSvg(cam, q, stroke, opacity, dashed) {
  if (!q) return ''
  const pos = dequant(q)
  let d = ''
  for (let i = 0; i < pos.length; i += 6) {
    const a = project(cam, pos[i], pos[i + 1], pos[i + 2])
    const b = project(cam, pos[i + 3], pos[i + 4], pos[i + 5])
    d += `<line x1="${a[0].toFixed(2)}" y1="${a[1].toFixed(2)}" x2="${b[0].toFixed(2)}" y2="${b[1].toFixed(2)}"/>`
  }
  const dash = dashed ? ' stroke-dasharray="2.2 1.8"' : ''
  const op = opacity < 1 ? ` stroke-opacity="${opacity}"` : ''
  return `<g fill="none" stroke="${stroke}" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"${op}${dash}>${d}</g>`
}

function assertClean(label, text) {
  for (const re of FORBIDDEN) {
    if (re.test(text)) {
      throw new Error(`Forbidden word in ${label}: ${re}`)
    }
  }
}

function makePi() {
  const panel = emptyLayer()
  const parts = emptyLayer()
  const wires = emptyLayer()
  const W = 1.7
  const D = 1.12
  const T = 0.045
  addBox(panel.i, W, T, D, 0, -T / 2, 0)
  const hx = W / 2 - 0.1
  const hz = D / 2 - 0.1
  for (const [x, z] of [
    [-hx, -hz],
    [hx, -hz],
    [-hx, hz],
    [hx, hz],
  ]) {
    addCyl(panel.b, 0.035, 0.035, T, 8, x, -T / 2, z)
  }
  addBox(parts.i, 0.3, 0.05, 0.3, -0.22, 0.025, 0.04)
  addBox(parts.b, 0.22, 0.03, 0.16, 0.12, 0.015, 0.06)
  addBox(parts.i, 0.16, 0.14, 0.13, W / 2 - 0.04, 0.07, -0.3)
  addBox(parts.i, 0.16, 0.14, 0.13, W / 2 - 0.04, 0.07, -0.12)
  addBox(parts.i, 0.2, 0.15, 0.18, W / 2 - 0.03, 0.075, 0.26)
  addBox(parts.b, 1.0, 0.08, 0.1, -0.08, 0.04, -D / 2 + 0.08)
  addBox(parts.b, 0.15, 0.06, 0.18, -W / 2 + 0.18, 0.03, D / 2 - 0.08)
  addBox(parts.b, 0.1, 0.04, 0.08, -W / 2 + 0.4, 0.02, D / 2 - 0.06)
  addBox(wires.d, 0.28, 0.02, 0.06, 0.32, 0.01, D / 2 - 0.14)
  addBox(wires.d, 0.06, 0.02, 0.2, 0.02, 0.01, 0.22)
  return [panel, parts, wires]
}

function makePcb() {
  const panel = emptyLayer()
  const parts = emptyLayer()
  const wires = emptyLayer()
  const W = 1.5
  const D = 1.05
  const T = 0.04
  addBox(panel.i, W, T, D, 0, -T / 2, 0)
  addBox(panel.b, 0.55, T, 0.1, 0, -T / 2, D / 2 - 0.05)
  addBox(parts.i, 0.38, 0.1, 0.24, -0.22, 0.05, -0.12)
  for (let n = 0; n < 4; n++) {
    const z = -0.2 + n * 0.08
    addBox(parts.b, 0.05, 0.05, 0.02, -0.44, 0.0, z)
    addBox(parts.b, 0.05, 0.05, 0.02, 0.0, 0.0, z)
  }
  addCyl(parts.i, 0.045, 0.045, 0.24, 6, 0.38, 0.045, 0.22, 'x')
  addBox(wires.i, 0.12, 0.012, 0.012, 0.2, 0.045, 0.22)
  addBox(wires.i, 0.12, 0.012, 0.012, 0.56, 0.045, 0.22)
  addCyl(parts.i, 0.07, 0.07, 0.18, 8, 0.38, 0.09, -0.28)
  addBox(wires.d, 0.55, 0.006, 0.018, 0.05, 0.003, 0.02)
  addBox(wires.d, 0.018, 0.006, 0.42, 0.32, 0.003, -0.02)
  addBox(wires.d, 0.36, 0.006, 0.018, -0.25, 0.003, 0.28)
  return [panel, parts, wires]
}

function makeSw() {
  const panel = emptyLayer()
  const parts = emptyLayer()
  const wires = emptyLayer()
  const L = 1.65
  const W = 0.72
  const H = 0.74
  addBox(panel.i, L, H, W, 0, H / 2, 0)
  for (let n = 0; n < 5; n++) {
    const x = -L / 2 + 0.22 + n * 0.3
    addBox(parts.b, 0.045, H - 0.1, 0.02, x, H / 2, W / 2)
    addBox(parts.b, 0.045, H - 0.1, 0.02, x, H / 2, -W / 2)
  }
  addBox(parts.i, 0.02, H - 0.12, W / 2 - 0.05, L / 2, H / 2, -W / 4)
  addBox(parts.i, 0.02, H - 0.12, W / 2 - 0.05, L / 2, H / 2, W / 4)
  addBox(wires.d, 0.02, H - 0.22, 0.02, L / 2 + 0.02, H / 2, 0)
  addBox(parts.b, L, 0.045, 0.08, 0, 0.022, W / 2 - 0.07)
  addBox(parts.b, L, 0.045, 0.08, 0, 0.022, -W / 2 + 0.07)
  return [panel, parts, wires]
}

function packLayer(layer) {
  const out = {}
  const i = quantize(layer.i)
  const b = quantize(layer.b)
  const d = quantize(layer.d)
  if (i) out.i = { p: i.p, s: i.s, o: i.o }
  if (b) out.b = { p: b.p, s: b.s, o: b.o }
  if (d) out.d = { p: d.p, s: d.s, o: d.o }
  return { packed: out, q: { i, b, d }, verts: (i?.count ?? 0) + (b?.count ?? 0) + (d?.count ?? 0) }
}

function writeLicense(filePath) {
  fs.writeFileSync(filePath, `${JSON.stringify({ license: 'saját' }, null, 2)}\n`)
}

function emit(id, layers) {
  fit(layers)
  const packedLayers = []
  let verts = 0
  const qLayers = []
  for (const layer of layers) {
    const { packed, q, verts: v } = packLayer(layer)
    packedLayers.push(packed)
    qLayers.push(q)
    verts += v
  }
  if (verts > 5000) {
    throw new Error(`${id} has ${verts} vertices (max 5000)`)
  }

  const cam = camera()
  const ink = '#0B2545'
  const blue = '#1F5FAD'
  let body = ''
  for (const q of qLayers) {
    body += linesToSvg(cam, q.i, ink, 1, false)
    body += linesToSvg(cam, q.b, blue, 0.55, false)
    body += linesToSvg(cam, q.d, blue, 0.55, true)
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">${body}</svg>\n`
  assertClean(`${id} svg`, svg)

  const ts = `/* generated by scripts/3d-bake.mjs — do not edit */
import type { BakedObject } from '../types'

const data: BakedObject = ${JSON.stringify({ id, layers: packedLayers })}

export default data
`
  assertClean(`${id} data`, JSON.stringify(packedLayers).replace(/[A-Za-z0-9+/=]{24,}/g, ''))

  const dataFile = path.join(genDir, `${id}.data.ts`)
  const svgFile = path.join(posterDir, `${id}.svg`)
  fs.writeFileSync(dataFile, ts)
  fs.writeFileSync(svgFile, svg)
  writeLicense(`${dataFile}.license.json`)
  writeLicense(`${svgFile}.license.json`)
  console.log(`${id}: ${verts} vertices`)
}

fs.mkdirSync(genDir, { recursive: true })
fs.mkdirSync(posterDir, { recursive: true })
emit('c-pi', makePi())
emit('c-pcb', makePcb())
emit('c-sw', makeSw())
console.log('3d-bake done')
