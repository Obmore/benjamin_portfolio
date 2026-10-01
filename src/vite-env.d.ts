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
