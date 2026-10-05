import { Anchor, Box, Cylinder, Ellipse, Group, Illustration, Shape } from 'zdog'

export type RollinStage = 'docked' | 'signal' | 'open' | 'leaving' | 'ride' | 'return' | 'locking' | 'charge'

// One coordinate system and complete solids keep the scooter aligned with a
// single dock. This is an original illustration, not a manufacturer CAD model.
export function createRollinScene(svg: SVGSVGElement) {
  const illo = new Illustration({ element: svg, zoom: 1.25, dragRotate: false })
  illo.setSize(500, 310)
  const world = new Group({ addTo: illo, rotate: { x: -.38, y: -24 * Math.PI / 180 }, translate: { x: -15, y: 0 } })
  const ink = '#183c4a', teal = '#198570'
  const floor = new Group({ addTo: world, translate: { y: 43 } })
  for (let x = -150; x <= 150; x += 40) new Shape({ addTo: floor, path: [{ x, z: -55 }, { x, z: 135 }], stroke: .6, color: '#d4e3df' })
  for (let z = -55; z <= 135; z += 40) new Shape({ addTo: floor, path: [{ x: -150, z }, { x: 150, z }], stroke: .6, color: '#d4e3df' })
  new Ellipse({ addTo: floor, width: 282, height: 92, rotate: { x: Math.PI / 2 }, translate: { z: -10, y: -.2 }, stroke: 12, fill: true, color: '#dae5e1' })
  // Within this front-facing camera arc the station stays behind the vehicle.
  // Never interleave station solids with the much taller steering column.
  const model = new Group({ addTo: world })
  // The wide plinth's average depth does not describe the depth beneath each
  // dock. Paint its complete solid first, then the housings standing on it;
  // otherwise its top face erases the far housing at oblique viewpoints.
  const station = new Group({ addTo: model })
  const plinth = new Group({ addTo: station, updateSort: true })
  new Box({ addTo: plinth, width: 268, height: 10, depth: 40, translate: { y: 34, z: -10 }, stroke: 1, color: '#a2babe', topFace: '#fcfefd', frontFace: '#b9cdce', rightFace: '#88a7af' })
  const docks = new Group({ addTo: station, updateSort: true })
  const lights: Shape[] = []
  let gate!: Anchor
  for (let i = 0; i < 4; i++) {
    // Surface indicators are drawn after their solid housing. The restricted
    // camera always sees this face, avoiding painter-order loss of small decals.
    const dock = new Group({ addTo: docks, translate: { x: -99 + i * 66, y: 6, z: 0 } })
    const housing = new Group({ addTo: dock, updateSort: true })
    new Box({ addTo: housing, width: 28, height: 45, depth: 27, stroke: 1, color: '#294e59', topFace: '#5b7d85', leftFace: '#3c6470', rightFace: '#153946', frontFace: '#244b58' })
    new Box({ addTo: housing, width: 19, height: 6, depth: 9, translate: { y: -12, z: 17 }, color: '#72939b', stroke: 1, topFace: '#bbd0d2' })
    const latch = new Anchor({ addTo: dock, translate: { x: -9, y: -16, z: 19 } })
    new Shape({ addTo: latch, path: [{}, { x: 18 }], stroke: 4, color: '#d7e6e4' })
    if (i === 2) gate = latch
    lights.push(new Shape({ addTo: dock, path: [{ x: -7 }, { x: 7 }], translate: { y: 8, z: 14.2 }, stroke: 3, color: i === 2 ? teal : '#89aeb0' }))
  }
  // Zdog sorts by each shape's average depth, not by pixel depth. Keep the
  // vehicle together so a dock cannot cut through its long steering column.
  // https://zzz.dog/extras#z-fighting
  const scooter = new Group({ addTo: model, translate: { x: 33 }, updateSort: true })
  const shadow = new Ellipse({ addTo: floor, width: 26, height: 130, rotate: { x: Math.PI / 2 }, translate: { x: 33, y: -.1, z: 77 }, stroke: 8, fill: true, color: '#c8d9d3' })
  for (const z of [27, 137]) {
    const wheel = new Group({ addTo: scooter, translate: { y: 25, z }, rotate: { y: Math.PI / 2 }, updateSort: true })
    new Cylinder({ addTo: wheel, diameter: 31, length: 9, stroke: false, color: '#163340', frontFace: '#274b58', backface: '#274b58' })
    for (const side of [-1, 1]) {
      new Ellipse({ addTo: wheel, diameter: 16, translate: { z: side * 5 }, stroke: 3, fill: true, color: '#87a7af' })
      new Shape({ addTo: wheel, translate: { z: side * 5.3 }, stroke: 5, color: '#294d5b' })
    }
  }
  const deck = new Group({ addTo: scooter, updateSort: true })
  new Box({ addTo: deck, width: 17, height: 6, depth: 85, translate: { y: 16, z: 88 }, stroke: 2, color: '#6d8d97', topFace: '#1a3c49', rightFace: '#abc0c6' })
  new Shape({ addTo: scooter, path: [{ y: 24, z: 137 }, { y: 8, z: 125 }, { y: 8, z: 113 }], stroke: 5, color: '#406776' })
  new Shape({ addTo: scooter, path: [{ y: 16, z: 48 }, { y: -1, z: 28 }, { y: 25, z: 27 }], stroke: 6, color: '#527887' })
  // The reflector and clamp belong to the column surface. Sorting their
  // average depths separately flipped the reflector behind the column between
  // -24 and -23 degrees. Keep these attached details in a fixed paint order.
  const steering = new Group({ addTo: scooter })
  new Shape({ addTo: steering, path: [{ y: 13, z: 27 }, { y: -102, z: 2 }], stroke: 7, color: '#94b1bb' })
  new Shape({ addTo: steering, path: [{ x: 2, y: 7, z: 26 }, { x: 2, y: -100, z: 3 }], stroke: 2, color: '#e2edee' })
  new Shape({ addTo: steering, translate: { y: -9, z: 22.2 }, stroke: 7, color: teal })
  new Shape({ addTo: steering, path: [{ x: -22, y: -104, z: 2 }, { x: 22, y: -104, z: 2 }], stroke: 7, color: ink })
  const display = new Group({ addTo: steering, updateSort: true })
  new Box({ addTo: display, width: 8, height: 3, depth: 10, translate: { y: -108, z: 3 }, color: teal, stroke: 1 })
  const signal = new Shape({ addTo: model, translate: { x: -99, y: 1, z: 20 }, stroke: 6, color: '#25b898', visible: false })
  // Keep the charging indicator beside the occupied third bay, clear of the
  // steering column throughout the supported camera arc.
  const charging = new Group({ addTo: world, translate: { x: 10, y: -34, z: 15 }, visible: false })
  new Ellipse({ addTo: charging, diameter: 23, stroke: 1.5, fill: true, color: '#f3fffa' })
  new Shape({ addTo: charging, path: [{ x: 2, y: -8 }, { x: -5, y: 1 }, { x: 0, y: 1 }, { x: -2, y: 8 }, { x: 5, y: -1 }, { x: 0, y: -1 }], closed: true, stroke: 1, fill: true, color: teal })
  let pose = { travel: 0, lock: 0, signal: 0 }, frame = 0
  const draw = () => {
    scooter.translate.z = pose.travel * 72
    shadow.translate.z = 77 + pose.travel * 72
    shadow.color = pose.travel ? '#d4e0da' : '#c8d9d3'
    gate.rotate.z = -pose.lock * Math.PI / 2
    signal.translate.x = -99 + pose.signal * 132
    illo.updateRenderGraph()
  }
  const cancel = () => { cancelAnimationFrame(frame); frame = 0; svg.dataset.motion = 'idle' }
  const show = (stage: RollinStage, animate = false, complete?: () => void) => {
    cancel()
    const target = { travel: stage === 'leaving' || stage === 'ride' ? 1 : 0, lock: ['open', 'leaving', 'ride', 'return'].includes(stage) ? 1 : 0, signal: stage === 'signal' ? 1 : 0 }
    signal.visible = stage === 'signal'
    charging.visible = stage === 'charge'
    lights[2].color = stage === 'charge' ? '#10a478' : teal
    const duration = !animate ? 0 : stage === 'signal' ? 450 : stage === 'open' || stage === 'locking' ? 350 : 850
    if (!duration) { pose = target; draw(); complete?.(); return }
    const from = { ...pose }, start = performance.now()
    svg.dataset.motion = 'active'
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration), eased = p * p * (3 - 2 * p)
      pose = { travel: from.travel + (target.travel - from.travel) * eased, lock: from.lock + (target.lock - from.lock) * eased, signal: from.signal + (target.signal - from.signal) * p }
      draw()
      if (p < 1) frame = requestAnimationFrame(tick)
      else { frame = 0; svg.dataset.motion = 'idle'; complete?.() }
    }
    frame = requestAnimationFrame(tick)
  }
  svg.dataset.motion = 'idle'
  draw()
  return {
    show,
    view(degrees: number) { world.rotate.y = degrees * Math.PI / 180; draw() },
    destroy: cancel,
  }
}
