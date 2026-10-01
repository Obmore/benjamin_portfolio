import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const root = path.dirname(fileURLToPath(import.meta.url))

function githubPagesPreview(): Plugin {
  return {
    name: 'github-pages-preview',
    configurePreviewServer(server) {
      const distDir = path.resolve(root, 'dist')
      return () => {
        server.middlewares.use((req, res, next) => {
          if (req.method !== 'GET' && req.method !== 'HEAD') {
            next()
            return
          }

          const incoming = req as typeof req & { originalUrl?: string }
          const original = incoming.originalUrl ?? req.url ?? '/'
          const pathname = original.split('?')[0] ?? '/'

          let decoded = pathname
          try {
            decoded = decodeURIComponent(pathname)
          } catch {
            // Keep the raw path and fall through to 404.html.
          }

          const distRoot = path.resolve(distDir)
          const relative = decoded.replace(/^\/+/, '').replace(/\/+$/, '')
          if (relative && !relative.split('/').includes('..')) {
            const indexFile = path.resolve(distRoot, relative, 'index.html')
            if (indexFile.startsWith(distRoot + path.sep) && fs.existsSync(indexFile)) {
              res.statusCode = 200
              res.setHeader('Content-Type', 'text/html; charset=utf-8')
              if (req.method === 'HEAD') {
                res.end()
                return
              }
              res.end(fs.readFileSync(indexFile))
              return
            }
          }

          const notFound = path.join(distRoot, '404.html')
          if (!fs.existsSync(notFound)) {
            next()
            return
          }

          res.statusCode = 404
          res.setHeader('Content-Type', 'text/html; charset=utf-8')
          if (req.method === 'HEAD') {
            res.end()
            return
          }
          res.end(fs.readFileSync(notFound))
        })
      }
    },
  }
}

function cvStats(fileName: string) {
  const bytes = fs.statSync(path.join(root, 'public/cv', fileName)).size
  return { bytes, kb: Math.round(bytes / 1024) }
}

const cvHu = cvStats('Ott_Benjamin_CV_HU.pdf')
const cvEn = cvStats('Ott_Benjamin_CV_EN.pdf')

export default defineConfig({
  base: '/',
  appType: 'mpa',
  plugins: [react(), tailwindcss(), githubPagesPreview()],
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
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(root, 'index.html'),
        megrendeles: path.resolve(root, 'megrendeles/index.html'),
      },
    },
  },
})
