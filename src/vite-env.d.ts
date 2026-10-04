/// <reference types="vite/client" />

declare const __CV_HU_LABEL__: string
declare const __CV_EN_LABEL__: string
declare const __CV_HU_KB__: number
declare const __CV_EN_KB__: number

interface ImportMetaEnv {
  readonly VITE_SHOW_ORDER_LINK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface ViewTransition {
  finished: Promise<void>
  ready: Promise<void>
  updateCallbackDone: Promise<void>
  skipTransition(): void
}

interface Document {
  startViewTransition: (updateCallback: () => void) => ViewTransition
}

declare module 'three' {
  export const NoBlending: number
  export const NormalBlending: number
  export class Vector3 {
    x: number
    y: number
    z: number
    constructor(x?: number, y?: number, z?: number)
    set(x: number, y: number, z: number): this
    copy(v: Vector3): this
    clone(): Vector3
    add(v: Vector3): this
    sub(v: Vector3): this
    project(camera: Camera): this
    unproject(camera: Camera): this
  }

  export class Color {
    constructor(color?: string | number)
    copy(c: Color): this
    clone(): Color
    multiplyScalar(s: number): this
    convertLinearToSRGB(): this
    lerpColors(a: Color, b: Color, t: number): this
  }

  export class Vector4 {
    x: number
    y: number
    z: number
    w: number
    constructor(x?: number, y?: number, z?: number, w?: number)
    set(x: number, y: number, z: number, w: number): this
  }

  export type Shader = {
    vertexShader: string
    fragmentShader: string
    uniforms: Record<string, { value: unknown }>
  }

  export class Object3D {
    position: Vector3
    rotation: { x: number; y: number; z: number; set(x: number, y: number, z: number): void }
    frustumCulled: boolean
    visible: boolean
    renderOrder: number
    children: Object3D[]
    parent: Object3D | null
    userData: Record<string, unknown>
    add(...object: Object3D[]): this
    traverse(callback: (object: Object3D) => void): void
    lookAt(x: number, y: number, z: number): void
    updateMatrixWorld(): void
    getWorldPosition(target: Vector3): Vector3
    remove(...object: Object3D[]): this
    geometry?: BufferGeometry
  }

  export class Group extends Object3D {}

  export class Camera extends Object3D {
    updateProjectionMatrix(): void
    updateMatrixWorld(): void
  }

  export class OrthographicCamera extends Camera {
    left: number
    right: number
    top: number
    bottom: number
    constructor(left: number, right: number, top: number, bottom: number, near: number, far: number)
  }

  export class Scene extends Object3D {}

  export class BufferAttribute {
    array: ArrayLike<number>
    count: number
    needsUpdate: boolean
    constructor(array: ArrayLike<number>, itemSize: number)
  }

  export class BufferGeometry {
    index: BufferAttribute | null
    setAttribute(name: string, attribute: BufferAttribute): this
    getAttribute(name: string): BufferAttribute
    setIndex(index: BufferAttribute | number[]): this
    computeBoundingSphere(): void
    computeVertexNormals(): void
    translate(x: number, y: number, z: number): this
    rotateY(angle: number): this
    clone(): BufferGeometry
    dispose(): void
  }

  export class BoxGeometry extends BufferGeometry {
    constructor(width?: number, height?: number, depth?: number)
  }

  export class EdgesGeometry extends BufferGeometry {
    constructor(geometry: BufferGeometry, thresholdAngle?: number)
  }

  export class Material {
    color: Color
    opacity: number
    depthWrite?: boolean
    depthTest?: boolean
    transparent?: boolean
    polygonOffset?: boolean
    polygonOffsetFactor?: number
    polygonOffsetUnits?: number
    defines?: Record<string, string | number>
    onBeforeCompile: (shader: Shader) => void
    customProgramCacheKey: () => string
    needsUpdate: boolean
    dispose(): void
  }

  export class ShaderMaterial extends Material {
    constructor(params?: {
      uniforms?: Record<string, { value: unknown }>
      vertexShader?: string
      fragmentShader?: string
      transparent?: boolean
      opacity?: number
      depthWrite?: boolean
      depthTest?: boolean
      blending?: number
      polygonOffset?: boolean
      polygonOffsetFactor?: number
      polygonOffsetUnits?: number
    })
    uniforms: Record<string, { value: unknown }>
    depthWrite: boolean
  }

  export class MeshBasicMaterial extends Material {
    constructor(params?: {
      color?: Color | string | number
      transparent?: boolean
      opacity?: number
      depthWrite?: boolean
      depthTest?: boolean
      polygonOffset?: boolean
      polygonOffsetFactor?: number
      polygonOffsetUnits?: number
    })
    depthWrite: boolean
  }

  export class LineBasicMaterial extends Material {
    constructor(params?: {
      color?: Color | string | number
      transparent?: boolean
      opacity?: number
      depthWrite?: boolean
      depthTest?: boolean
      polygonOffset?: boolean
      polygonOffsetFactor?: number
      polygonOffsetUnits?: number
    })
  }

  export class PointsMaterial extends Material {
    constructor(params?: {
      color?: Color | string | number
      size?: number
      sizeAttenuation?: boolean
    })
  }

  export class Mesh extends Object3D {
    geometry: BufferGeometry
    material: Material | Material[]
    constructor(geometry?: BufferGeometry, material?: Material)
  }

  export class LineSegments extends Object3D {
    isLineSegments: true
    geometry: BufferGeometry
    material: Material | Material[]
    constructor(geometry: BufferGeometry, material: Material)
  }

  export class Points extends Object3D {
    geometry: BufferGeometry
    material: Material | Material[]
    constructor(geometry: BufferGeometry, material: Material)
  }

  export class WebGLRenderer {
    domElement: HTMLCanvasElement
    autoClear: boolean
    info: {
      reset(): void
      render: { calls: number; triangles: number }
      memory: { geometries: number; textures: number }
    }
    constructor(params?: {
      canvas?: HTMLCanvasElement
      alpha?: boolean
      antialias?: boolean
      preserveDrawingBuffer?: boolean
      powerPreference?: string
      failIfMajorPerformanceCaveat?: boolean
    })
    setClearColor(color: number, alpha: number): void
    setPixelRatio(value: number): void
    getPixelRatio(): number
    setSize(width: number, height: number, updateStyle?: boolean): void
    render(scene: Scene, camera: Camera): void
    compile(scene: Scene, camera: Camera): void
    compileAsync(scene: Scene, camera: Camera): Promise<void>
    dispose(): void
    forceContextLoss(): void
  }
}
