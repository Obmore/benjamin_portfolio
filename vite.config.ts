import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const root = path.dirname(fileURLToPath(import.meta.url))

function decodePathname(urlPath: string): string {
  const pathname = urlPath.split('?')[0] ?? '/'
  try {
    return decodeURIComponent(pathname)
  } catch {
    return pathname
  }
}

function fileInside(distRoot: string, candidate: string): string | null {
  const resolved = path.resolve(candidate)
  const rootWithSep = distRoot.endsWith(path.sep) ? distRoot : distRoot + path.sep
  if (resolved !== distRoot && !resolved.startsWith(rootWithSep)) return null
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) return null
  return resolved
}

function githubPagesPreview(): Plugin {
  return {
    name: 'github-pages-preview',
    configurePreviewServer(server) {
      const distRoot = path.resolve(root, 'dist')
      return () => {
        server.middlewares.use((req, res, next) => {
          if (req.method !== 'GET' && req.method !== 'HEAD') {
            next()
            return
          }

          const rewritten = decodePathname(req.url ?? '/')
          if (rewritten === '/' || rewritten === '') {
            next()
            return
          }
          const rewrittenFile = fileInside(distRoot, path.join(distRoot, rewritten.replace(/^\/+/, '')))
          if (rewrittenFile) {
            next()
            return
          }

          const incoming = req as typeof req & { originalUrl?: string }
          const original = decodePathname(incoming.originalUrl ?? req.url ?? '/')
          const relative = original.replace(/^\/+/, '').replace(/\/+$/, '')
          if (relative && !relative.split('/').includes('..')) {
            const indexFile = fileInside(distRoot, path.join(distRoot, relative, 'index.html'))
            if (indexFile) {
              res.statusCode = 200
              res.setHeader('Content-Type', 'text/html; charset=utf-8')
              res.end(req.method === 'HEAD' ? undefined : fs.readFileSync(indexFile))
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
          res.end(req.method === 'HEAD' ? undefined : fs.readFileSync(notFound))
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
    modulePreload: {
      polyfill: false,
      resolveDependencies(_filename, deps) {
        return deps.filter((dep) => !/(?:^|\/)(?:three|gsap|hero3d-boot|after-lcp)/.test(dep))
      },
    },
    rollupOptions: {
      input: {
        main: path.resolve(root, 'index.html'),
        megrendeles: path.resolve(root, 'megrendeles/index.html'),
      },
      output: {
        manualChunks(id) {
          const n = id.replaceAll('\\', '/')
          if (n.includes('node_modules/three') || n.includes('/src/three/three-core')) return 'three'
          if (n.includes('node_modules/gsap')) return 'gsap'
          if (n.includes('/src/three/view-manager')) return 'three-view'
          if (n.includes('/src/three/hero-scroll')) return 'gsap'
          if (n.includes('/src/three/')) return 'three-hero'
          return undefined
        },
      },
    },
  },
})
