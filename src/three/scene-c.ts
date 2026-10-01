import {
  BufferAttribute,
  BufferGeometry,
  Group,
  LineBasicMaterial,
  LineDashedMaterial,
  LineSegments,
  OrthographicCamera,
} from 'three'
import type { Color } from 'three'
import { decodeLines } from './decode'
import type { BakedLayer, BakedObject, Quantized } from './types'

export const C_FRUSTUM = 1.35
export const C_ELEV = 30 * (Math.PI / 180)
export const C_AZIM = 45 * (Math.PI / 180)

export function makeCCamera() {
  const f = C_FRUSTUM
  const camera = new OrthographicCamera(-f, f, f, -f, 0.1, 40)
  const d = 12
  camera.position.set(
    d * Math.cos(C_ELEV) * Math.sin(C_AZIM),
    d * Math.sin(C_ELEV),
    d * Math.cos(C_ELEV) * Math.cos(C_AZIM),
  )
  camera.lookAt(0, 0, 0)
  camera.updateProjectionMatrix()
  return camera
}

function linesFrom(q: Quantized, color: Color, opacity: number, dashed: boolean) {
  const pos = decodeLines(q)
  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(pos, 3))
  const mat = dashed
    ? new LineDashedMaterial({
        color,
        transparent: opacity < 1,
        opacity,
        dashSize: 0.05,
        gapSize: 0.035,
      })
    : new LineBasicMaterial({ color, transparent: opacity < 1, opacity })
  const segs = new LineSegments(geo, mat)
  if (dashed) segs.computeLineDistances()
  return segs
}

function addQuant(layer: Group, q: Quantized | undefined, color: Color, opacity: number, dashed: boolean) {
  if (!q) return
  layer.add(linesFrom(q, color, opacity, dashed))
}

function fillLayer(dst: Group, src: BakedLayer, ink: Color, blue: Color) {
  addQuant(dst, src.i, ink, 1, false)
  addQuant(dst, src.b, blue, 0.55, false)
  addQuant(dst, src.d, blue, 0.55, true)
}

export function createCObject(data: BakedObject, ink: Color, blue: Color) {
  const root = new Group()
  const layers: Group[] = []
  for (const src of data.layers) {
    const g = new Group()
    fillLayer(g, src, ink, blue)
    root.add(g)
    layers.push(g)
  }
  return { root, layers }
}

export function disposeObject(root: Group) {
  root.traverse((obj) => {
    const line = obj as LineSegments
    if (!line.isLineSegments) return
    line.geometry.dispose()
    const mat = line.material
    if (Array.isArray(mat)) mat.forEach((item) => item.dispose())
    else mat.dispose()
  })
}
