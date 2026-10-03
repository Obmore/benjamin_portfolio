import type { K1Scene } from './hero-k1'

type Vec3 = {
  x: number
  y: number
  z: number
  set(x: number, y: number, z: number): Vec3
  copy(v: Vec3): Vec3
  project(cam: unknown): Vec3
  unproject(cam: unknown): Vec3
}

type Obj3 = {
  visible: boolean
  frustumCulled: boolean
  children: Obj3[]
  parent: Obj3 | null
  position: Vec3
  userData: Record<string, unknown>
  add(...object: Obj3[]): Obj3
  remove(...object: Obj3[]): Obj3
  updateMatrixWorld(): void
  getWorldPosition(target: Vec3): Vec3
}

type Cam3 = { updateMatrixWorld(): void }

export type HeroQaHost = {
  Vector3: new (x?: number, y?: number, z?: number) => Vec3
  BoxGeometry: new (width?: number, height?: number, depth?: number) => { dispose(): void }
  MeshBasicMaterial: new (params?: {
    transparent?: boolean
    opacity?: number
    depthWrite?: boolean
  }) => { dispose(): void }
  Mesh: new (geo: { dispose(): void }, mat: { dispose(): void }) => Obj3
  getRoot: () => Obj3 | null
  getCamera: () => Cam3 | null
  getK1: () => K1Scene | null
  getBox: () => HTMLElement | null
  snapshotInfo: () => {
    calls: number
    triangles: number
    geometries: number
    textures: number
    memory: { geometries: number; textures: number }
  }
  getRafCount: () => number
  getProgress: () => number
  getDpr: () => number
  getTier: () => string
  seek: (p: number) => void
  dispose: () => void
  paint: () => void
}

type HeroEnd = {
  x: number
  y: number
  ax: number
  ay: number
  id: string
  targetId: string
  kind: 'pad' | 'via' | 'pin'
}

type Hero3dQa = {
  scene: Obj3 | null
  layers: number
  ends: HeroEnd[]
  info: ReturnType<HeroQaHost['snapshotInfo']>
  rafCount: number
  progress: number
  dpr: number
  tier: string
  seek: (p: number) => void
  dispose: () => void
  qaEndWorld: (i: number) => { x: number; y: number; z: number } | undefined
  qaShiftEnd: (i: number, px: number) => void
}

declare global {
  interface Window {
    __hero3d?: Hero3dQa
  }
}

const TOP_Y = 0.07 / 2 + 0.004
const BOT_Y = -0.07 / 2 - 0.004
const CHIP_HALF = 0.25

function worldY(k1: K1Scene, layer: 'top' | 'bot') {
  const v = k1.uLayerY.value
  return layer === 'bot' ? v.x + BOT_Y : v.z + TOP_Y
}

function mapPt(cam: Cam3, v: Vec3, width: number, height: number) {
  v.project(cam)
  return { x: (v.x * 0.5 + 0.5) * width, y: (-v.y * 0.5 + 0.5) * height }
}

function countTaggedLayers(root: Obj3 | null) {
  if (!root) return 0
  let n = 0
  for (const child of root.children) {
    if (typeof child.userData.layer === 'string' && child.visible) n += 1
  }
  return n
}

export function attachHeroQa(host: HeroQaHost) {
  const tmp = new host.Vector3()
  const tmpB = new host.Vector3()
  const geo = new host.BoxGeometry(0.02, 0.02, 0.02)
  const mat = new host.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  const endMeshes: Obj3[] = []
  const pinMeshes: Obj3[] = []
  const k1 = host.getK1()
  const root = host.getRoot()
  const fill = root?.children.find((c) => c.userData.layer === 'fill') ?? root

  const makeAnchor = (id: string, x: number, y: number, z: number) => {
    const mesh = new host.Mesh(geo, mat)
    mesh.frustumCulled = false
    mesh.visible = false
    mesh.userData.anchorId = id
    mesh.position.set(x, y, z)
    fill?.add(mesh)
    return mesh
  }

  if (k1 && fill) {
    for (const rec of k1.endPairs) {
      endMeshes.push(makeAnchor(rec.id, rec.x, worldY(k1, rec.layer), rec.z))
    }
    for (const anc of k1.anchors) {
      if (anc.kind !== 'pin' || anc.layer !== 'top') continue
      const alongX = Math.abs(anc.x) >= Math.abs(anc.z)
      const x = alongX ? Math.sign(anc.x) * CHIP_HALF : anc.x
      const z = alongX ? anc.z : Math.sign(anc.z) * CHIP_HALF
      pinMeshes.push(makeAnchor(anc.id, x, worldY(k1, 'top'), z))
    }
  }

  const projectMesh = (mesh: Obj3, cam: Cam3, width: number, height: number) => {
    mesh.updateMatrixWorld()
    mesh.getWorldPosition(tmp)
    return mapPt(cam, tmp, width, height)
  }

  const sync = () => {
    const scene = host.getK1()
    const cam = host.getCamera()
    if (!scene) return
    for (let i = 0; i < endMeshes.length; i += 1) {
      const rec = scene.endPairs[i]
      const mesh = endMeshes[i]
      if (!rec || !mesh) continue
      mesh.position.y = worldY(scene, rec.layer)
    }
    for (const mesh of pinMeshes) {
      if (endMeshes.includes(mesh)) continue
      mesh.position.y = worldY(scene, 'top')
    }
    const box = host.getBox()
    if (!cam || !box) return
    const width = Math.max(1, box.clientWidth)
    const height = Math.max(1, box.clientHeight)
    cam.updateMatrixWorld()
    for (const mesh of pinMeshes) {
      const s = projectMesh(mesh, cam, width, height)
      mesh.userData.sx = s.x
      mesh.userData.sy = s.y
    }
    const hook = window.__hero3d
    if (!hook) return
    hook.info = host.snapshotInfo()
    hook.rafCount = host.getRafCount()
    hook.progress = host.getProgress()
    hook.dpr = host.getDpr()
    hook.tier = host.getTier()
  }

  const hook = {
    info: host.snapshotInfo(),
    rafCount: host.getRafCount(),
    progress: host.getProgress(),
    dpr: host.getDpr(),
    tier: host.getTier(),
    seek: host.seek,
    dispose: host.dispose,
    qaEndWorld(i: number) {
      const mesh = endMeshes[i]
      if (!mesh) return undefined
      mesh.updateMatrixWorld()
      mesh.getWorldPosition(tmp)
      return { x: tmp.x, y: tmp.y, z: tmp.z }
    },
    qaShiftEnd(i: number, px: number) {
      const mesh = endMeshes[i]
      const cam = host.getCamera()
      const box = host.getBox()
      if (!mesh || !cam || !box) return
      const width = Math.max(1, box.clientWidth)
      cam.updateMatrixWorld()
      mesh.updateMatrixWorld()
      mesh.getWorldPosition(tmp)
      tmpB.copy(tmp).project(cam)
      tmpB.x += (px / width) * 2
      tmpB.unproject(cam)
      mesh.position.x += tmpB.x - tmp.x
      mesh.position.y += tmpB.y - tmp.y
      mesh.position.z += tmpB.z - tmp.z
      host.paint()
    },
  } as Hero3dQa

  Object.defineProperty(hook, 'scene', {
    enumerable: true,
    configurable: true,
    get() {
      return host.getRoot()
    },
  })
  Object.defineProperty(hook, 'layers', {
    enumerable: true,
    configurable: true,
    get() {
      return countTaggedLayers(host.getRoot())
    },
  })
  Object.defineProperty(hook, 'ends', {
    enumerable: true,
    configurable: true,
    get() {
      const scene = host.getK1()
      const cam = host.getCamera()
      const box = host.getBox()
      if (!scene || !cam || !box) return []
      const width = Math.max(1, box.clientWidth)
      const height = Math.max(1, box.clientHeight)
      cam.updateMatrixWorld()
      return scene.endPairs.map((rec, i) => {
        const mesh = endMeshes[i]
        const end = mesh
          ? projectMesh(mesh, cam, width, height)
          : mapPt(cam, tmp.set(rec.x, worldY(scene, rec.layer), rec.z), width, height)
        const anc = scene.anchors.find((a) => a.id === rec.id && a.layer === rec.layer)
        if (!anc) {
          return {
            x: end.x,
            y: end.y,
            ax: end.x + 99,
            ay: end.y + 99,
            id: rec.id,
            targetId: rec.id,
            kind: 'pad' as const,
          }
        }
        const a = mapPt(cam, tmp.set(anc.x, worldY(scene, anc.layer), anc.z), width, height)
        return {
          x: end.x,
          y: end.y,
          ax: a.x,
          ay: a.y,
          id: anc.id,
          targetId: rec.id,
          kind: anc.kind,
        }
      })
    },
  })

  window.__hero3d = hook
  sync()

  const unique = new Set([...endMeshes, ...pinMeshes])
  return {
    sync,
    detach() {
      for (const mesh of unique) {
        mesh.parent?.remove(mesh)
      }
      geo.dispose()
      mat.dispose()
      endMeshes.length = 0
      pinMeshes.length = 0
      unique.clear()
    },
  }
}
