#!/usr/bin/env node
import { writeFileSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const vite = await createServer({ root, server: { middlewareMode: true }, appType: 'custom' })
try {
  const three = await vite.ssrLoadModule('three')
  const hero = await vite.ssrLoadModule('/src/three/hero-k1.ts')
  const poster = await vite.ssrLoadModule('/src/three/k1-poster.ts')
  const { POSTER_W, POSTER_H } = await vite.ssrLoadModule('/src/three/k1-layout.ts')

  const scene = await hero.createK1Scene(
    {
      surface: new three.Color('#ffffff'),
      ink: new three.Color('#0f172a'),
      accent: new three.Color('#1e3a5f'),
      line: new three.Color('#d7e2ef'),
    },
    false,
  )
  hero.setK1Aspect(scene, POSTER_W / POSTER_H)
  hero.applyK1Progress(scene, 1, 0)
  scene.camera.updateProjectionMatrix()
  scene.camera.updateMatrixWorld()

  const svg = poster.svgFromK1Scene(scene, POSTER_W, POSTER_H)
  if (!svg.includes('data-pose="100"')) {
    throw new Error('baked poster must keep data-pose="100" literal')
  }

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
