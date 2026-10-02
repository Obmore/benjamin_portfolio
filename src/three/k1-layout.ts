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

export function chipPins(): { x: number; z: number; w: number; d: number }[] {
  const out: { x: number; z: number; w: number; d: number }[] = []
  for (const t of PIN_TS) {
    out.push({ x: -PIN_X, z: t, w: PIN, d: 0.032 })
    out.push({ x: PIN_X, z: t, w: PIN, d: 0.032 })
    out.push({ x: t, z: -PIN_X, w: 0.032, d: PIN })
    out.push({ x: t, z: PIN_X, w: 0.032, d: PIN })
  }
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

export const topTraces: readonly Poly[] = [
  [L(1), [-0.55, PIN_TS[1]], [-0.55, connPinZ(2)], C(2)],
  [C(2), C(5)],
  [C(5), [V.nw[0], connPinZ(5)], V.nw],
  [V.se, [0.55, V.se[1]], [0.55, PIN_TS[1]], R(1)],
  [T(2), [T(2)[0], V.n[1]], V.n],
  [Btm(2), [Btm(2)[0], V.s[1]], V.s],
  [L(3), [-PIN_X, PAD.r1[1]], PAD.r1],
  [R(3), [PIN_X, PAD.r2[1]], PAD.r2],
  [R(0), [PIN_X, PAD.c1[1]], PAD.c1],
  [C(0), [V.sw[0], connPinZ(0)], V.sw],
  [R(4), [V.ne[0], PIN_TS[4]], V.ne],
]

export const botTraces: readonly Poly[] = [
  [V.nw, [V.nw[0], V.se[1]], V.se],
  [V.n, [V.n[0], V.ne[1]], V.ne],
  [V.s, [V.s[0], V.sw[1]], V.sw],
]

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
  { x: L(1)[0], z: L(1)[1], layer: 'chip' },
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

export function traceEnds(): { x: number; z: number; layer: 'top' | 'bot' }[] {
  const out: { x: number; z: number; layer: 'top' | 'bot' }[] = []
  for (const poly of topTraces) {
    const a = poly[0]
    const b = poly[poly.length - 1]
    out.push({ x: a[0], z: a[1], layer: 'top' }, { x: b[0], z: b[1], layer: 'top' })
  }
  for (const poly of botTraces) {
    const a = poly[0]
    const b = poly[poly.length - 1]
    out.push({ x: a[0], z: a[1], layer: 'bot' }, { x: b[0], z: b[1], layer: 'bot' })
  }
  return out
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
