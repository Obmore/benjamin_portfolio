import {
  allBotPads,
  allTopPads,
  boardOutline,
  BOT_Y,
  botTraces,
  boxEdges,
  BT,
  CHIP,
  CHIP_Y,
  conn,
  passives,
  poseYs,
  POSTER_H,
  POSTER_W,
  TOP_Y,
  topTraces,
  vias,
} from './k1-layout'
import { worldToSvg } from './k1-project'

function r(n: number) {
  return Math.round(n * 100) / 100
}

function pathFromPolys(polys: readonly (readonly (readonly [number, number])[])[], y: number) {
  const parts: string[] = []
  for (const poly of polys) {
    const pts = poly.map(([x, z]) => worldToSvg(x, y, z))
    parts.push(pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${r(p.x)},${r(p.y)}`).join(''))
  }
  return parts.join('')
}

function pathFromEdges(edges: readonly (readonly (readonly [number, number, number])[])[]) {
  const parts: string[] = []
  for (const [a, b] of edges) {
    const p = worldToSvg(a[0], a[1], a[2])
    const q = worldToSvg(b[0], b[1], b[2])
    parts.push(`M${r(p.x)},${r(p.y)}L${r(q.x)},${r(q.y)}`)
  }
  return parts.join('')
}

export function buildPosterSvg(w = POSTER_W, h = POSTER_H) {
  const ys = poseYs(1)
  const topY = ys.top + TOP_Y
  const botY = ys.bot + BOT_Y
  const subY = ys.sub
  const partsY = ys.parts
  const chipY = ys.chip + CHIP_Y

  const botCopper = pathFromPolys([...botTraces, ...allBotPads()], botY)
  const topCopper = pathFromPolys([...topTraces, ...allTopPads()], topY)
  const botOutline = pathFromPolys([boardOutline], botY)
  const topOutline = pathFromPolys([boardOutline], topY)

  const subFill = boardOutline
    .slice(0, 4)
    .map(([x, z]) => worldToSvg(x, subY, z))
  const subPoly = subFill.map((p, i) => `${i === 0 ? 'M' : 'L'}${r(p.x)},${r(p.y)}`).join('') + 'Z'

  const viaPath = vias
    .map(([x, z]) => {
      const a = worldToSvg(x, topY, z)
      const b = worldToSvg(x, botY, z)
      return `M${r(a.x)},${r(a.y)}L${r(b.x)},${r(b.y)}`
    })
    .join('')

  const partEdges: ReturnType<typeof boxEdges> = [
    ...boxEdges(conn.w, conn.h, conn.d, conn.x, partsY + BT / 2 + conn.h / 2, conn.z),
  ]
  for (const p of passives) {
    partEdges.push(...boxEdges(p.w, p.h, p.d, p.x, partsY + BT / 2 + p.h / 2, p.z))
  }
  const partsPath = pathFromEdges(partEdges)
  const chipPath = pathFromEdges(boxEdges(CHIP, 0.1, CHIP, 0, chipY, 0))
  const chipFillPts = [
    [-CHIP / 2, -CHIP / 2],
    [CHIP / 2, -CHIP / 2],
    [CHIP / 2, CHIP / 2],
    [-CHIP / 2, CHIP / 2],
  ].map(([x, z]) => worldToSvg(x, chipY, z))
  const chipFill = chipFillPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${r(p.x)},${r(p.y)}`).join('') + 'Z'

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" class="hero-3d-poster" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" fill="none" aria-hidden="true" focusable="false" data-pose="100">`,
    `<g stroke="var(--color-ink)" stroke-opacity=".55" stroke-width="1" stroke-linejoin="round"><path d="${botOutline}"/><path d="${botCopper}"/></g>`,
    `<g fill="var(--color-surface)" fill-opacity=".18" stroke="var(--color-ink)" stroke-opacity=".55" stroke-width="1" stroke-linejoin="round"><path d="${subPoly}"/></g>`,
    `<g stroke="var(--color-accent)" stroke-opacity="1" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="${topCopper}"/><path d="${viaPath}"/></g>`,
    `<g fill="var(--color-surface)" stroke="var(--color-ink)" stroke-opacity=".55" stroke-width="1" stroke-linejoin="round"><path fill="none" d="${topOutline}"/><path d="${chipFill}"/><path fill="none" d="${partsPath}"/><path fill="none" d="${chipPath}"/></g>`,
    `</svg>`,
  ].join('')
}
