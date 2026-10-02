export const BW = 2.4
export const BD = 1.6
export const BT = 0.07
export const CHIP = 0.5
export const PIN = 0.08
export const EXPLODE = 0.18
export const CHIP_LIFT = 0.08

export type Pair = readonly [number, number]
export type Poly = readonly Pair[]

export const passives: readonly { x: number; z: number; w: number; d: number; h: number }[] = [
  { x: -0.58, z: 0.48, w: 0.2, d: 0.1, h: 0.055 },
  { x: 0.58, z: 0.48, w: 0.2, d: 0.1, h: 0.055 },
  { x: 0.62, z: -0.5, w: 0.12, d: 0.2, h: 0.05 },
  { x: -0.62, z: -0.5, w: 0.22, d: 0.1, h: 0.04 },
]

export const conn = { x: -1.1, z: 0, w: 0.16, d: 0.92, h: 0.12 }

export const vias: readonly Pair[] = [
  [0.95, -0.22],
  [-0.95, 0.22],
  [0.95, 0.48],
  [-0.95, -0.48],
  [0.22, 0.64],
  [-0.22, -0.64],
]

export const topTraces: readonly Poly[] = [
  [
    [-1.02, -0.18],
    [-0.72, -0.18],
    [-0.72, -0.12],
    [-0.33, -0.12],
  ],
  [
    [0.33, -0.12],
    [0.72, -0.12],
    [0.72, -0.22],
    [0.95, -0.22],
  ],
  [
    [-0.95, 0.22],
    [-0.72, 0.22],
    [-1.02, 0.18],
  ],
  [
    [-1.02, 0.18],
    [-1.02, -0.18],
  ],
  [
    [-1.02, -0.36],
    [-0.95, -0.48],
  ],
  [
    [-1.02, 0.36],
    [-0.78, 0.36],
    [-0.78, 0.48],
    [-0.68, 0.48],
  ],
  [
    [0.33, 0.12],
    [0.55, 0.12],
    [0.55, 0.48],
    [0.68, 0.48],
  ],
  [
    [0.33, -0.22],
    [0.33, -0.5],
    [0.56, -0.5],
  ],
  [
    [-0.33, 0.12],
    [-0.33, 0.48],
    [-0.48, 0.48],
  ],
  [
    [0.12, 0.33],
    [0.12, 0.64],
    [0.22, 0.64],
  ],
  [
    [-0.12, -0.33],
    [-0.12, -0.64],
    [-0.22, -0.64],
  ],
  [
    [0.95, 0.48],
    [0.78, 0.48],
  ],
]

export const botTraces: readonly Poly[] = [
  [
    [0.95, -0.22],
    [0.95, 0.48],
    [-0.95, 0.48],
    [-0.95, 0.22],
  ],
  [
    [-0.95, -0.48],
    [0.22, -0.48],
    [0.22, -0.64],
  ],
  [
    [0.95, 0.48],
    [0.22, 0.48],
    [0.22, 0.64],
  ],
  [
    [-0.22, -0.64],
    [-0.22, -0.48],
    [-0.95, -0.48],
  ],
]

export type PathNode = { x: number; z: number; layer: 'top' | 'bot' | 'chip' }

export const loop: readonly PathNode[] = [
  { x: -1.02, z: -0.18, layer: 'top' },
  { x: -0.72, z: -0.18, layer: 'top' },
  { x: -0.72, z: -0.12, layer: 'top' },
  { x: -0.33, z: -0.12, layer: 'chip' },
  { x: 0.33, z: -0.12, layer: 'chip' },
  { x: 0.72, z: -0.12, layer: 'top' },
  { x: 0.72, z: -0.22, layer: 'top' },
  { x: 0.95, z: -0.22, layer: 'top' },
  { x: 0.95, z: -0.22, layer: 'bot' },
  { x: 0.95, z: 0.48, layer: 'bot' },
  { x: -0.95, z: 0.48, layer: 'bot' },
  { x: -0.95, z: 0.22, layer: 'bot' },
  { x: -0.95, z: 0.22, layer: 'top' },
  { x: -0.72, z: 0.22, layer: 'top' },
  { x: -1.02, z: 0.18, layer: 'top' },
  { x: -1.02, z: -0.18, layer: 'top' },
]

export function chipPins(): { x: number; z: number; w: number; d: number }[] {
  const out: { x: number; z: number; w: number; d: number }[] = []
  const n = 5
  const span = 0.32
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1) - 0.5) * span
    out.push({ x: -(CHIP / 2 + PIN / 2), z: t, w: PIN, d: 0.032 })
    out.push({ x: CHIP / 2 + PIN / 2, z: t, w: PIN, d: 0.032 })
    out.push({ x: t, z: -(CHIP / 2 + PIN / 2), w: 0.032, d: PIN })
    out.push({ x: t, z: CHIP / 2 + PIN / 2, w: 0.032, d: PIN })
  }
  return out
}

export function connPins(): { x: number; z: number }[] {
  const n = 8
  const span = 0.72
  const out: { x: number; z: number }[] = []
  for (let i = 0; i < n; i++) {
    out.push({ x: conn.x + 0.12, z: (i / (n - 1) - 0.5) * span })
  }
  return out
}

export function padSquares(cx: number, cz: number, s = 0.07): Poly {
  const h = s / 2
  return [
    [cx - h, cz - h],
    [cx + h, cz - h],
    [cx + h, cz + h],
    [cx - h, cz + h],
    [cx - h, cz - h],
  ]
}

export function allTopPads(): Poly[] {
  const pads: Poly[] = vias.map(([x, z]) => padSquares(x, z))
  for (const p of connPins()) pads.push(padSquares(p.x, p.z, 0.055))
  for (const p of chipPins()) pads.push(padSquares(p.x, p.z, 0.045))
  pads.push(padSquares(-0.68, 0.48, 0.06), padSquares(0.68, 0.48, 0.06), padSquares(0.56, -0.5, 0.06))
  return pads
}

export function allBotPads(): Poly[] {
  return vias.map(([x, z]) => padSquares(x, z))
}
