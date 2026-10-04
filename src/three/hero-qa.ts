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
  getPixelRatio: () => number
  getTier: () => string
  getPulseU: () => number
  getPulseMax: () => number
  seek: (p: number) => void
  dispose: () => void
  paint: () => void
  shiftEnd: (i: number, px: number) => void
  forceContextLoss: () => void
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
  pixelRatio: number
  tier: string
  pulseU: number
  pulseMax: number
  seek: (p: number) => void
  dispose: () => void
  qaEndWorld: (i: number) => { x: number; y: number; z: number } | undefined
  qaShiftEnd: (i: number, px: number) => void
  forceContextLoss: () => void
}

declare global {
  interface Window {
    __hero3d?: Hero3dQa
  }
}

const TOP_Y = 0.07 / 2 + 0.004
const BOT_Y = -0.07 / 2 - 0.004

function worldY(k1: K1Scene, layer: 'top' | 'bot') {
  const v = k1.uLayerY.value
  return layer === 'bot' ? v.x + BOT_Y : v.z + TOP_Y
}

function endWorld(k1: K1Scene, i: number) {
  const rec = k1.endPairs[i]
  if (!rec) return undefined
  return { x: rec.x, y: rec.wy ?? worldY(k1, rec.layer), z: rec.z }
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
  const geo = new host.BoxGeometry(0.02, 0.02, 0.02)
  const mat = new host.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  const pinMeshes: Obj3[] = []
  const k1 = host.getK1()
  const root = host.getRoot()

  const makeAnchor = (id: string, x: number, y: number, z: number) => {
    const mesh = new host.Mesh(geo, mat)
    mesh.frustumCulled = false
    mesh.visible = false
    mesh.userData.anchorId = id
    mesh.position.set(x, y, z)
    root?.add(mesh)
    return mesh
  }

  if (k1 && root) {
    for (const anc of k1.anchors) {
      if (anc.kind !== 'pin' || anc.layer !== 'top') continue
      pinMeshes.push(makeAnchor(anc.id, anc.x, worldY(k1, 'top'), anc.z))
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
    for (const mesh of pinMeshes) {
      const id = mesh.userData.anchorId
      const anc = typeof id === 'string' ? scene.anchors.find((a) => a.id === id && a.kind === 'pin') : undefined
      if (!anc) continue
      mesh.position.set(anc.x, worldY(scene, 'top'), anc.z)
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
    hook.tier = host.getTier()
  }

  const hook = {
    info: host.snapshotInfo(),
    rafCount: host.getRafCount(),
    progress: host.getProgress(),
    tier: host.getTier(),
    seek: host.seek,
    dispose: host.dispose,
    qaEndWorld(i: number) {
      const scene = host.getK1()
      if (!scene) return undefined
      return endWorld(scene, i)
    },
    qaShiftEnd(i: number, px: number) {
      host.shiftEnd(i, px)
      host.paint()
    },
    forceContextLoss() {
      host.forceContextLoss()
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
  Object.defineProperty(hook, 'pixelRatio', {
    enumerable: true,
    configurable: true,
    get() {
      return host.getPixelRatio()
    },
  })
  Object.defineProperty(hook, 'pulseU', {
    enumerable: true,
    configurable: true,
    get() {
      return host.getPulseU()
    },
  })
  Object.defineProperty(hook, 'pulseMax', {
    enumerable: true,
    configurable: true,
    get() {
      return host.getPulseMax()
    },
  })
  Object.defineProperty(hook, 'dpr', {
    enumerable: true,
    configurable: true,
    get() {
      return host.getDpr()
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
      return scene.endPairs.map((rec) => {
        const end = mapPt(cam, tmp.set(rec.x, rec.wy ?? worldY(scene, rec.layer), rec.z), width, height)
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

  return {
    sync,
    detach() {
      for (const mesh of pinMeshes) {
        mesh.parent?.remove(mesh)
      }
      geo.dispose()
      mat.dispose()
      pinMeshes.length = 0
    },
  }
}
