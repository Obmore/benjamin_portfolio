import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const root = path.dirname(fileURLToPath(import.meta.url))

function cvStats(fileName: string) {
  const bytes = fs.statSync(path.join(root, 'public/cv', fileName)).size
  return { bytes, kb: Math.round(bytes / 1024) }
}

const cvHu = cvStats('Ott_Benjamin_CV_HU.pdf')
const cvEn = cvStats('Ott_Benjamin_CV_EN.pdf')
const threeQa = process.env.VITE_3D_QA === 'true'

function isThreeChunk(id: string) {
  const n = id.replaceAll('\\', '/')
  if (n.includes('node_modules/three')) return 'three'
  if (n.includes('/src/three/view-manager')) return 'three-view'
  if (n.includes('/src/three/scene-c') || n.includes('/src/three/decode')) return 'three-c'
  if (n.includes('/src/three/generated/c-pi')) return 'three-c-pi'
  if (n.includes('/src/three/generated/c-pcb')) return 'three-c-pcb'
  if (n.includes('/src/three/generated/c-sw')) return 'three-c-sw'
  if (n.includes('/src/three/boot')) return 'three-boot'
  return undefined
}

export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  define: {
    __CV_HU_KB__: JSON.stringify(cvHu.kb),
    __CV_EN_KB__: JSON.stringify(cvEn.kb),
    __CV_HU_LABEL__: JSON.stringify(`PDF · ${cvHu.kb} KB`),
    __CV_EN_LABEL__: JSON.stringify(`PDF · ${cvEn.kb} KB`),
    __3D_QA__: JSON.stringify(threeQa),
  },
  resolve: {
    alias: {
      '@': path.resolve(root, './src'),
    },
  },
  build: {
    modulePreload: {
      resolveDependencies(_filename, deps) {
        return deps.filter((dep) => !/(?:^|\/)three/.test(dep))
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          return isThreeChunk(id)
        },
      },
    },
  },
})
