/** Build-time K1 scene from k1-layout constants. Used by export-hero-glb. */

export const POSTER_ASPECT = 4 / 3
export const LID_SCALE = 0.94

export function placeCam(THREE, cam, layout) {
  const el = (layout.CAM_ELEV * Math.PI) / 180
  const az = (layout.CAM_AZIM * Math.PI) / 180
  cam.position.set(
    layout.CAM_DIST * Math.cos(el) * Math.sin(az),
    layout.CAM_DIST * Math.sin(el),
    layout.CAM_DIST * Math.cos(el) * Math.cos(az),
  )
  cam.lookAt(0, 0, 0)
  cam.updateProjectionMatrix()
  cam.updateMatrixWorld()
}

function makeFill(THREE, color) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: false,
    depthTest: true,
    depthWrite: true,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  })
}

function makeLine(THREE, color) {
  return new THREE.LineBasicMaterial({
    color,
    transparent: false,
    depthTest: true,
    depthWrite: true,
  })
}

function addBox(THREE, parent, name, w, h, d, x, y, z, fill, ink) {
  const geo = new THREE.BoxGeometry(w, h, d)
  const mesh = new THREE.Mesh(geo, fill)
  mesh.name = name
  mesh.position.set(x, y, z)
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), ink)
  edges.name = `${name}-edges`
  mesh.add(edges)
  parent.add(mesh)
  return mesh
}

function lineGeometry(THREE, positions) {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  return geo
}

function polysToPositions(polys, y) {
  const pos = []
  for (const poly of polys) {
    for (let i = 0; i < poly.length - 1; i += 1) {
      const a = poly[i]
      const b = poly[i + 1]
      pos.push(a[0], y, a[1], b[0], y, b[1])
    }
  }
  return pos
}

export function buildK1Scene(THREE, layout) {
  const fill = makeFill(THREE, 0xffffff)
  const ink = makeLine(THREE, 0x7b7f8a)
  const accent = makeLine(THREE, 0x1e3a5f)

  const scene = new THREE.Scene()
  const root = new THREE.Group()
  root.name = 'k1-root'
  scene.add(root)

  const layerBot = new THREE.Group()
  layerBot.name = 'layer-bot'
  const layerSub = new THREE.Group()
  layerSub.name = 'layer-sub'
  const layerTop = new THREE.Group()
  layerTop.name = 'layer-top'
  const layerChip = new THREE.Group()
  layerChip.name = 'layer-chip'
  const trackAccent = new THREE.Group()
  trackAccent.name = 'track-accent'
  root.add(layerBot, layerSub, layerTop, layerChip, trackAccent)

  addBox(THREE, layerSub, 'board', layout.BW, layout.BT, layout.BD, 0, 0, 0, fill, ink)

  const botInk = [
    ...polysToPositions([layout.boardOutline], layout.BOT_Y),
    ...polysToPositions(layout.botPads, layout.BOT_Y),
    ...polysToPositions(layout.botTraces, layout.BOT_Y),
  ]
  const botLines = new THREE.LineSegments(lineGeometry(THREE, botInk), ink)
  botLines.name = 'track-ink'
  layerBot.add(botLines)

  const topInk = [
    ...polysToPositions([layout.boardOutline], layout.TOP_Y),
    ...polysToPositions(layout.topPads, layout.TOP_Y),
    ...polysToPositions(layout.topTraces, layout.TOP_Y),
  ]
  const topLines = new THREE.LineSegments(lineGeometry(THREE, topInk), ink)
  topLines.name = 'track-ink'
  layerTop.add(topLines)

  addBox(
    THREE,
    layerTop,
    'conn-body',
    layout.conn.w,
    layout.conn.h,
    layout.conn.d,
    layout.conn.x,
    layout.BT / 2 + layout.conn.h / 2,
    layout.conn.z,
    fill,
    ink,
  )
  for (let i = 0; i < layout.passives.length; i += 1) {
    const p = layout.passives[i]
    addBox(THREE, layerTop, `passive-${i}`, p.w, p.h, p.d, p.x, layout.BT / 2 + p.h / 2, p.z, fill, ink)
  }

  addBox(THREE, layerChip, 'chip-body', layout.CHIP, 0.1, layout.CHIP, 0, layout.CHIP_Y, 0, fill, ink)
  const lid = layout.CHIP * LID_SCALE
  const lidH = 0.006
  addBox(
    THREE,
    layerChip,
    'chip-lid',
    lid,
    lidH,
    lid,
    0,
    layout.CHIP_Y + 0.05 + lidH / 2,
    0,
    fill,
    ink,
  )
  for (const pin of layout.chipPins) {
    addBox(THREE, layerChip, pin.id, pin.w, 0.02, pin.d, pin.x, layout.CHIP_Y - 0.04, pin.z, fill, ink)
  }

  for (const [name, pair] of layout.viaEntries) {
    const geo = lineGeometry(THREE, [pair[0], layout.BOT_Y, pair[1], pair[0], layout.TOP_Y, pair[1]])
    const line = new THREE.LineSegments(geo, accent)
    line.name = `via-${name}`
    trackAccent.add(line)
  }

  const aspect = POSTER_ASPECT
  const cam = new THREE.OrthographicCamera(
    -layout.FRUSTUM * aspect,
    layout.FRUSTUM * aspect,
    layout.FRUSTUM,
    -layout.FRUSTUM,
    0.1,
    40,
  )
  cam.name = 'hero-cam'
  placeCam(THREE, cam, layout)
  scene.add(cam)

  return { scene, camera: cam, root, materials: { fill, ink, accent } }
}

export function packLayout(L) {
  return {
    BW: L.BW,
    BD: L.BD,
    BT: L.BT,
    CHIP: L.CHIP,
    PIN: L.PIN,
    CAM_ELEV: L.CAM_ELEV,
    CAM_AZIM: L.CAM_AZIM,
    CAM_DIST: L.CAM_DIST,
    FRUSTUM: L.FRUSTUM,
    TOP_Y: L.TOP_Y,
    BOT_Y: L.BOT_Y,
    CHIP_Y: L.CHIP_Y,
    conn: L.conn,
    passives: L.passives,
    boardOutline: L.boardOutline,
    topTraces: L.topTraces,
    botTraces: L.botTraces,
    chipPins: L.chipPins(),
    topPads: L.allTopPads(),
    botPads: L.allBotPads(),
    viaEntries: Object.entries(L.V),
  }
}
