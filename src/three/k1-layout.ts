export const BW = 2.4
export const BD = 1.6
export const BT = 0.07
export const CHIP = 0.5
export const PIN = 0.08
export const EXPLODE = 0.18
export const CHIP_LIFT = 0.08
export const CAM_ELEV = 45
export const CAM_AZIM = 20
export const CAM_DIST = 12
export const FRUSTUM = 1.48
export const TOP_Y = BT / 2 + 0.004
export const BOT_Y = -BT / 2 - 0.004
export const CHIP_Y = BT / 2 + 0.05
export const PIN_X = CHIP / 2 + PIN / 2
export const PIN_TS = [-0.16, -0.08, 0, 0.08, 0.16] as const
export const POSTER_W = 320
export const POSTER_H = 240

export type Pair = readonly [number, number]
export type Poly = readonly Pair[]

export const V = {
  ne: [0.86, 0.5] as const,
  se: [0.86, -0.28] as const,
  nw: [-0.86, 0.28] as const,
  sw: [-0.86, -0.5] as const,
  n: [0.26, 0.62] as const,
  s: [-0.26, -0.62] as const,
}

export const vias: readonly Pair[] = [V.ne, V.se, V.nw, V.sw, V.n, V.s]

export const conn = { x: -1.04, z: 0, w: 0.16, d: 0.64, h: 0.1 }
export const CONN_PIN_X = conn.x + conn.w / 2 + 0.03
export const CONN_PIN_N = 8
export const CONN_PIN_SPAN = 0.56

export function connPinZ(i: number) {
  return (i / (CONN_PIN_N - 1) - 0.5) * CONN_PIN_SPAN
}

export const passives: readonly { x: number; z: number; w: number; d: number; h: number }[] = [
  { x: -0.5, z: 0.5, w: 0.16, d: 0.08, h: 0.05 },
  { x: 0.5, z: 0.5, w: 0.16, d: 0.08, h: 0.05 },
  { x: 0.5, z: -0.5, w: 0.08, d: 0.16, h: 0.045 },
]

export const PAD = {
  r1: [-0.5, 0.5] as const,
  r2: [0.5, 0.5] as const,
  c1: [0.5, -0.5] as const,
}

export type PathNode = { x: number; z: number; layer: 'top' | 'bot' | 'chip' }

export function poseYs(p: number) {
  const explode = Math.min(1, p / 0.5)
  const rest = Math.max(0, (p - 0.5) / 0.5)
  const gap = BW * EXPLODE * explode
  const chipLift = BW * CHIP_LIFT * rest
  return {
    explode,
    rest,
    gap,
    chipLift,
    top: gap,
    parts: gap,
    chip: gap + chipLift,
    sub: 0,
    bot: -gap,
  }
}

export type PinRec = { id: string; x: number; z: number; w: number; d: number }

export function chipPins(): PinRec[] {
  const out: PinRec[] = []
  PIN_TS.forEach((t, i) => {
    out.push({ id: `pin-L${i}`, x: -PIN_X, z: t, w: PIN, d: 0.032 })
    out.push({ id: `pin-R${i}`, x: PIN_X, z: t, w: PIN, d: 0.032 })
    out.push({ id: `pin-B${i}`, x: t, z: -PIN_X, w: 0.032, d: PIN })
    out.push({ id: `pin-T${i}`, x: t, z: PIN_X, w: 0.032, d: PIN })
  })
  return out
}

export function connPins(): { x: number; z: number }[] {
  const out: { x: number; z: number }[] = []
  for (let i = 0; i < CONN_PIN_N; i++) out.push({ x: CONN_PIN_X, z: connPinZ(i) })
  return out
}

export function padSquares(cx: number, cz: number, s = 0.055): Poly {
  const h = s / 2
  return [
    [cx - h, cz - h],
    [cx + h, cz - h],
    [cx + h, cz + h],
    [cx - h, cz + h],
    [cx - h, cz - h],
  ]
}

export const boardOutline: Poly = [
  [-BW / 2, -BD / 2],
  [BW / 2, -BD / 2],
  [BW / 2, BD / 2],
  [-BW / 2, BD / 2],
  [-BW / 2, -BD / 2],
]

function L(i: number): Pair {
  return [-PIN_X, PIN_TS[i]]
}
function R(i: number): Pair {
  return [PIN_X, PIN_TS[i]]
}
function T(i: number): Pair {
  return [PIN_TS[i], PIN_X]
}
function Btm(i: number): Pair {
  return [PIN_TS[i], -PIN_X]
}
function C(i: number): Pair {
  return [CONN_PIN_X, connPinZ(i)]
}

export type TraceRoute = {
  poly: Poly
  startId: string
  endId: string
}

export const topRoutes: readonly TraceRoute[] = [
  { poly: [L(1), [-0.55, PIN_TS[1]], [-0.55, connPinZ(2)], C(2)], startId: 'pin-L1', endId: 'pad-conn-2' },
  { poly: [C(2), C(5)], startId: 'pad-conn-2', endId: 'pad-conn-5' },
  { poly: [C(5), [V.nw[0], connPinZ(5)], V.nw], startId: 'pad-conn-5', endId: 'via-nw' },
  { poly: [V.se, [0.55, V.se[1]], [0.55, PIN_TS[1]], R(1)], startId: 'via-se', endId: 'pin-R1' },
  { poly: [T(2), [T(2)[0], V.n[1]], V.n], startId: 'pin-T2', endId: 'via-n' },
  { poly: [Btm(2), [Btm(2)[0], V.s[1]], V.s], startId: 'pin-B2', endId: 'via-s' },
  { poly: [L(3), [-PIN_X, PAD.r1[1]], PAD.r1], startId: 'pin-L3', endId: 'pad-r1' },
  { poly: [R(3), [PIN_X, PAD.r2[1]], PAD.r2], startId: 'pin-R3', endId: 'pad-r2' },
  { poly: [R(0), [PIN_X, PAD.c1[1]], PAD.c1], startId: 'pin-R0', endId: 'pad-c1' },
  { poly: [C(0), [V.sw[0], connPinZ(0)], V.sw], startId: 'pad-conn-0', endId: 'via-sw' },
  { poly: [R(4), [V.ne[0], PIN_TS[4]], V.ne], startId: 'pin-R4', endId: 'via-ne' },
]

export const botRoutes: readonly TraceRoute[] = [
  { poly: [V.nw, [V.nw[0], V.se[1]], V.se], startId: 'via-nw', endId: 'via-se' },
  { poly: [V.n, [V.n[0], V.ne[1]], V.ne], startId: 'via-n', endId: 'via-ne' },
  { poly: [V.s, [V.s[0], V.sw[1]], V.sw], startId: 'via-s', endId: 'via-sw' },
]

export const topTraces: readonly Poly[] = topRoutes.map((t) => t.poly)
export const botTraces: readonly Poly[] = botRoutes.map((t) => t.poly)

export const loop: readonly PathNode[] = [
  { x: L(1)[0], z: L(1)[1], layer: 'chip' },
  { x: L(1)[0], z: L(1)[1], layer: 'top' },
  { x: -0.55, z: PIN_TS[1], layer: 'top' },
  { x: -0.55, z: connPinZ(2), layer: 'top' },
  { x: C(2)[0], z: C(2)[1], layer: 'top' },
  { x: C(5)[0], z: C(5)[1], layer: 'top' },
  { x: V.nw[0], z: connPinZ(5), layer: 'top' },
  { x: V.nw[0], z: V.nw[1], layer: 'top' },
  { x: V.nw[0], z: V.nw[1], layer: 'bot' },
  { x: V.nw[0], z: V.se[1], layer: 'bot' },
  { x: V.se[0], z: V.se[1], layer: 'bot' },
  { x: V.se[0], z: V.se[1], layer: 'top' },
  { x: 0.55, z: V.se[1], layer: 'top' },
  { x: 0.55, z: PIN_TS[1], layer: 'top' },
  { x: R(1)[0], z: R(1)[1], layer: 'top' },
  { x: R(1)[0], z: R(1)[1], layer: 'chip' },
]

export function allTopPads(): Poly[] {
  const pads: Poly[] = vias.map(([x, z]) => padSquares(x, z))
  for (const p of connPins()) pads.push(padSquares(p.x, p.z, 0.045))
  for (const p of chipPins()) pads.push(padSquares(p.x, p.z, 0.04))
  pads.push(padSquares(PAD.r1[0], PAD.r1[1], 0.05), padSquares(PAD.r2[0], PAD.r2[1], 0.05), padSquares(PAD.c1[0], PAD.c1[1], 0.05))
  return pads
}

export function allBotPads(): Poly[] {
  return vias.map(([x, z]) => padSquares(x, z))
}

export type TraceEnd = {
  x: number
  z: number
  layer: 'top' | 'bot'
  id: string
}

function pushRouteEnds(out: TraceEnd[], routes: readonly TraceRoute[], layer: 'top' | 'bot') {
  for (const route of routes) {
    const first = route.poly[0]
    const last = route.poly[route.poly.length - 1]
    out.push(
      { x: first[0], z: first[1], layer, id: route.startId },
      { x: last[0], z: last[1], layer, id: route.endId },
    )
  }
}

export function traceEnds(): TraceEnd[] {
  const out: TraceEnd[] = []
  pushRouteEnds(out, topRoutes, 'top')
  pushRouteEnds(out, botRoutes, 'bot')
  return out
}

export type AnchorKind = 'pad' | 'via' | 'pin'

export type Anchor = {
  id: string
  kind: AnchorKind
  x: number
  z: number
  layer: 'top' | 'bot'
}

export function allAnchors(): Anchor[] {
  const out: Anchor[] = []
  for (const [name, p] of Object.entries(V)) {
    out.push({ id: `via-${name}`, kind: 'via', x: p[0], z: p[1], layer: 'top' })
    out.push({ id: `via-${name}`, kind: 'via', x: p[0], z: p[1], layer: 'bot' })
  }
  for (const p of chipPins()) {
    out.push({ id: p.id, kind: 'pin', x: p.x, z: p.z, layer: 'top' })
  }
  connPins().forEach((p, i) => {
    out.push({ id: `pad-conn-${i}`, kind: 'pad', x: p.x, z: p.z, layer: 'top' })
  })
  out.push(
    { id: 'pad-r1', kind: 'pad', x: PAD.r1[0], z: PAD.r1[1], layer: 'top' },
    { id: 'pad-r2', kind: 'pad', x: PAD.r2[0], z: PAD.r2[1], layer: 'top' },
    { id: 'pad-c1', kind: 'pad', x: PAD.c1[0], z: PAD.c1[1], layer: 'top' },
  )
  return out
}

export function anchorById(id: string, layer: 'top' | 'bot', pool: readonly Anchor[]): Anchor | undefined {
  return pool.find((a) => a.id === id && a.layer === layer)
}

export function topFaceEdges(
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
): [Pair3, Pair3][] {
  const y1 = y + h / 2
  const x0 = x - w / 2
  const x1 = x + w / 2
  const z0 = z - d / 2
  const z1 = z + d / 2
  const c: Pair3[] = [
    [x0, y1, z0],
    [x1, y1, z0],
    [x1, y1, z1],
    [x0, y1, z1],
  ]
  return [
    [c[0], c[1]],
    [c[1], c[2]],
    [c[2], c[3]],
    [c[3], c[0]],
  ]
}

export function boxEdges(
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
): [Pair3, Pair3][] {
  const x0 = x - w / 2
  const x1 = x + w / 2
  const y0 = y - h / 2
  const y1 = y + h / 2
  const z0 = z - d / 2
  const z1 = z + d / 2
  const c: Pair3[] = [
    [x0, y0, z0],
    [x1, y0, z0],
    [x1, y0, z1],
    [x0, y0, z1],
    [x0, y1, z0],
    [x1, y1, z0],
    [x1, y1, z1],
    [x0, y1, z1],
  ]
  const idx: [number, number][] = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 4],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ]
  return idx.map(([i, j]) => [c[i], c[j]])
}

type Pair3 = readonly [number, number, number]
