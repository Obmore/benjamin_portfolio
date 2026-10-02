import { writeFileSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const vite = await createServer({ root, server: { middlewareMode: true }, appType: 'custom' })
try {
  const mod = await vite.ssrLoadModule('/src/three/k1-poster.ts')
  const svg = mod.buildPosterSvg()
  const svgPath = path.join(root, 'src/components/visuals/hero-k1-poster.svg')
  writeFileSync(svgPath, `${svg}\n`)

  const htmlPath = path.join(root, 'index.html')
  const html = readFileSync(htmlPath, 'utf8')
  const block = `    <!-- HERO_K1_POSTER_BEGIN -->\n    <template id="hero-k1-poster-template">${svg}</template>\n    <!-- HERO_K1_POSTER_END -->`
  const replaced = html.includes('HERO_K1_POSTER_BEGIN')
    ? html.replace(/<!-- HERO_K1_POSTER_BEGIN -->[\s\S]*?<!-- HERO_K1_POSTER_END -->/, block)
    : html.replace('<div id="root"></div>', `${block}\n    <div id="root"></div>`)
  writeFileSync(htmlPath, replaced)
  console.log('baked', path.relative(root, svgPath), `${svg.length} chars`)
} finally {
  await vite.close()
}
