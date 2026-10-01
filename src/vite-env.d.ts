/// <reference types="vite/client" />

declare const __CV_HU_LABEL__: string
declare const __CV_EN_LABEL__: string
declare const __CV_HU_KB__: number
declare const __CV_EN_KB__: number
declare const __3D_QA__: boolean

declare module 'three' {
  export class Vector3 {
    x: number
    y: number
    z: number
    constructor(x?: number, y?: number, z?: number)
    set(x: number, y: number, z: number): this
    copy(v: Vector3): this
  }

  export class Color {
    constructor(color?: string | number)
  }

  export class Object3D {
    position: Vector3
    rotation: { x: number; y: number; z: number; set(x: number, y: number, z: number): void }
    add(object: Object3D): this
    traverse(callback: (object: Object3D) => void): void
    lookAt(x: number, y: number, z: number): void
  }

  export class Group extends Object3D {}

  export class Camera extends Object3D {
    updateProjectionMatrix(): void
    updateMatrixWorld(): void
  }

  export class OrthographicCamera extends Camera {
    constructor(left: number, right: number, top: number, bottom: number, near: number, far: number)
  }

  export class Scene extends Object3D {}

  export class BufferAttribute {
    constructor(array: ArrayLike<number>, itemSize: number)
  }

  export class BufferGeometry {
    setAttribute(name: string, attribute: BufferAttribute): this
    dispose(): void
  }

  export class Material {
    dispose(): void
  }

  export class LineBasicMaterial extends Material {
    constructor(params?: {
      color?: Color | string | number
      transparent?: boolean
      opacity?: number
    })
  }

  export class LineDashedMaterial extends LineBasicMaterial {
    constructor(params?: {
      color?: Color | string | number
      transparent?: boolean
      opacity?: number
      dashSize?: number
      gapSize?: number
    })
  }

  export class LineSegments extends Object3D {
    isLineSegments: true
    geometry: BufferGeometry
    material: Material | Material[]
    constructor(geometry: BufferGeometry, material: Material)
    computeLineDistances(): this
  }

  export class WebGLRenderer {
    domElement: HTMLCanvasElement
    autoClear: boolean
    constructor(params?: {
      canvas?: HTMLCanvasElement
      alpha?: boolean
      antialias?: boolean
      powerPreference?: string
    })
    setClearColor(color: number, alpha: number): void
    setPixelRatio(value: number): void
    getPixelRatio(): number
    setScissorTest(value: boolean): void
    setSize(width: number, height: number, updateStyle?: boolean): void
    setViewport(x: number, y: number, width: number, height: number): void
    setScissor(x: number, y: number, width: number, height: number): void
    clear(): void
    render(scene: Scene, camera: Camera): void
    dispose(): void
    forceContextLoss(): void
  }
}
