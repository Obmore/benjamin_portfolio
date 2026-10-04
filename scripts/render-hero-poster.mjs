import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { serveRoot } from './static-root.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const glbRel = '/public/hero/k1.glb'
const out1 = path.join(root, 'public/hero/k1-p0@1x.webp')
const out2 = path.join(root, 'public/hero/k1-p0@2x.webp')
const W = 400
const H = 300

const { server, url } = await serveRoot(root)
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: W, height: H } })
await page.goto(`${url}/scripts/render-hero-poster.html`, { waitUntil: 'networkidle' })
await page.waitForFunction(() => typeof window.renderPoster === 'function')

async function writePoster(width, height, dest) {
  const bytes = await page.evaluate(
    ({ glb, width, height }) => window.renderPoster(glb, width, height),
    { glb: glbRel, width, height },
  )
  fs.writeFileSync(dest, Buffer.from(bytes))
  const size = fs.statSync(dest).size
  console.log(`poster ${path.basename(dest)} ${size} B (${(size / 1024).toFixed(2)} KB) ${width}x${height}`)
  if (size > 50 * 1024) {
    throw new Error(`${dest} exceeds 50 KB`)
  }
}

try {
  await writePoster(W, H, out1)
  await writePoster(W * 2, H * 2, out2)
} finally {
  await browser.close()
  server.close()
}
