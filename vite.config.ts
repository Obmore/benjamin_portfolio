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

export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  define: {
    __CV_HU_KB__: JSON.stringify(cvHu.kb),
    __CV_EN_KB__: JSON.stringify(cvEn.kb),
    __CV_HU_LABEL__: JSON.stringify(`PDF · ${cvHu.kb} KB`),
    __CV_EN_LABEL__: JSON.stringify(`PDF · ${cvEn.kb} KB`),
  },
  resolve: {
    alias: {
      '@': path.resolve(root, './src'),
    },
  },
})
