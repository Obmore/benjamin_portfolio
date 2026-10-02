import { CAM_AZIM, CAM_DIST, CAM_ELEV, FRUSTUM, POSTER_H, POSTER_W } from './k1-layout'

export type Ndc = { x: number; y: number }

export function projectK1(
  x: number,
  y: number,
  z: number,
  aspect: number,
  elev = CAM_ELEV,
  azim = CAM_AZIM,
): Ndc {
  const el = (elev * Math.PI) / 180
  const az = (azim * Math.PI) / 180
  const ex = CAM_DIST * Math.cos(el) * Math.sin(az)
  const ey = CAM_DIST * Math.sin(el)
  const ez = CAM_DIST * Math.cos(el) * Math.cos(az)
  const zlen = Math.hypot(ex, ey, ez) || 1
  const zax = ex / zlen
  const zay = ey / zlen
  const zaz = ez / zlen
  let xax = zaz
  let xay = 0
  let xaz = -zax
  const xlen = Math.hypot(xax, xay, xaz) || 1
  xax /= xlen
  xay /= xlen
  xaz /= xlen
  const yax = zay * xaz - zaz * xay
  const yay = zaz * xax - zax * xaz
  const yaz = zax * xay - zay * xax
  const px = x - ex
  const py = y - ey
  const pz = z - ez
  const camX = px * xax + py * xay + pz * xaz
  const camY = px * yax + py * yay + pz * yaz
  return { x: camX / (FRUSTUM * aspect), y: camY / FRUSTUM }
}

export function ndcToSvg(n: Ndc, w = POSTER_W, h = POSTER_H) {
  return { x: (n.x * 0.5 + 0.5) * w, y: (-n.y * 0.5 + 0.5) * h }
}

export function worldToSvg(x: number, y: number, z: number, w = POSTER_W, h = POSTER_H) {
  return ndcToSvg(projectK1(x, y, z, w / h), w, h)
}
