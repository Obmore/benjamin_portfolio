/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_QUOTE_FORM_ENDPOINT?: string
  readonly VITE_QUOTE_FORM_ACCESS_KEY?: string
  readonly VITE_PREVIEW?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
