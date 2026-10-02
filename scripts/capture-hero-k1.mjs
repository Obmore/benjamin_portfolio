#!/usr/bin/env node
/**
 * 16 K1 hero renders, labeled contact sheet, 2x chip crops, poster vs live p100 pixel diffs.
 * Expects vite preview at http://127.0.0.1:4173
 */
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'test-results', 'hero-k1-renders')
mkdirSync(outDir, { recursive: true })

const BASE = 'http://127.0.0.1:4173'
const VPS = [
  { w: 1440, h: 900, name: '1440' },
  { w: 390, h: 844, name: '390' },
]
const THEMES = ['light', 'dark']
const THRESH = 12

function decodePngRgba(png) {
  if (png.subarray(1, 4).toString('ascii') !== 'PNG') throw new Error('not png')
  let offset = 8
  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = 0
  const chunks = []
  while (offset + 8 <= png.length) {
    const length = png.readUInt32BE(offset)
    const type = png.toString('ascii', offset + 4, offset + 8)
    const data = png.subarray(offset + 8, offset + 8 + length)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      bitDepth = data[8]
      colorType = data[9]
    } else if (type === 'IDAT') {
      chunks.push(Buffer.from(data))
    } else if (type === 'IEND') {
      break
    }
    offset += 12 + length
  }
  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
    throw new Error(`unsupported png ${bitDepth}/${colorType}`)
  }
  const bpp = colorType === 6 ? 4 : 3
  const stride = width * bpp
  const inflated = inflateSync(Buffer.concat(chunks))
  const pixels = Buffer.alloc(width * height * 4)
  let src = 0
  let prev = Buffer.alloc(stride)
  const paeth = (a, b, c) => {
    const p = a + b - c
    const pa = Math.abs(p - a)
    const pb = Math.abs(p - b)
    const pc = Math.abs(p - c)
    if (pa <= pb && pa <= pc) return a
    if (pb <= pc) return b
    return c
  }
  for (let y = 0; y < height; y += 1) {
    const filter = inflated[src]
    src += 1
    const row = Buffer.alloc(stride)
    const raw = inflated.subarray(src, src + stride)
    src += stride
    for (let i = 0; i < stride; i += 1) {
      const left = i >= bpp ? row[i - bpp] : 0
      const up = prev[i]
      const upLeft = i >= bpp ? prev[i - bpp] : 0
      const x = raw[i]
      if (filter === 0) row[i] = x
      else if (filter === 1) row[i] = (x + left) & 255
      else if (filter === 2) row[i] = (x + up) & 255
      else if (filter === 3) row[i] = (x + ((left + up) >> 1)) & 255
      else if (filter === 4) row[i] = (x + paeth(left, up, upLeft)) & 255
      else throw new Error(`bad filter ${filter}`)
    }
    for (let x = 0; x < width; x += 1) {
      const si = x * bpp
      const di = (y * width + x) * 4
      pixels[di] = row[si]
      pixels[di + 1] = row[si + 1]
      pixels[di + 2] = row[si + 2]
      pixels[di + 3] = bpp === 4 ? row[si + 3] : 255
    }
    prev = row
  }
  return { width, height, pixels }
}

function pixelDiff(aBuf, bBuf) {
  const a = decodePngRgba(aBuf)
  const b = decodePngRgba(bBuf)
  const w = Math.min(a.width, b.width)
  const h = Math.min(a.height, b.height)
  let changed = 0
  let sad = 0
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (y * a.width + x) * 4
      const j = (y * b.width + x) * 4
      let d = 0
      for (let c = 0; c < 4; c += 1) {
        const dd = Math.abs(a.pixels[i + c] - b.pixels[j + c])
        d = Math.max(d, dd)
        sad += dd
      }
      if (d > THRESH) changed += 1
    }
  }
  return { w, h, changed, mae: sad / (w * h * 4) }
}

async function waitReady(page) {
  await page.waitForFunction(
    () => Boolean(document.querySelector('.hero-3d')?.classList.contains('is-ready') && window.__hero3d?.seek),
    null,
    { timeout: 30000 },
  )
}

async function shotClip(page, file, frac) {
  const box = await page.locator('.hero-3d').boundingBox()
  if (!box) throw new Error('missing hero-3d')
  await page.screenshot({
    path: file,
    animations: 'disabled',
    clip: {
      x: box.x + box.width * frac.x0,
      y: box.y + box.height * frac.y0,
      width: box.width * (frac.x1 - frac.x0),
      height: box.height * (frac.y1 - frac.y0),
    },
  })
}

const CHIP_P100 = { x0: 0.33, y0: 0.14, x1: 0.67, y1: 0.5 }
const CHIP_P0 = { x0: 0.33, y0: 0.28, x1: 0.67, y1: 0.64 }

async function main() {
  const browser = await chromium.launch()
  const files = []
  const diffs = []

  for (const theme of THEMES) {
    for (const vp of VPS) {
      const context = await browser.newContext({
        viewport: { width: vp.w, height: vp.h },
        deviceScaleFactor: 2,
        colorScheme: theme === 'dark' ? 'dark' : 'light',
      })
      const page = await context.newPage()
      await page.addInitScript((t) => {
        try {
          localStorage.setItem('theme', t)
          sessionStorage.removeItem('ob-3d-off')
        } catch {
          /* ignore */
        }
      }, theme)
      await page.goto(`${BASE}/?qa3d=1`, { waitUntil: 'domcontentloaded' })
      await page.evaluate(() => document.fonts.ready)
      await waitReady(page)
      await page.evaluate((t) => {
        document.documentElement.dataset.theme = t
        document.documentElement.style.colorScheme = t
      }, theme)

      const poses = [
        ['p0', 0],
        ['p50', 0.5],
        ['p100', 1],
      ]
      for (const [key, progress] of poses) {
        await page.evaluate(() => {
          const box = document.querySelector('.hero-3d')
          const canvas = box?.querySelector('canvas')
          const poster = box?.querySelector('.hero-3d-poster-host')
          if (canvas) canvas.style.opacity = '1'
          if (poster) poster.style.opacity = '0'
        })
        await page.evaluate((p) => window.__hero3d.seek(p), progress)
        await page.waitForTimeout(50)
        const name = `hero_${key}_${vp.name}_${theme}.png`
        await page.locator('.hero-3d').screenshot({ path: path.join(outDir, name), animations: 'disabled' })
        files.push(name)
        if (vp.name === '390' && (key === 'p0' || key === 'p100')) {
          const cropName = `crop_chip_live_${key}_390_${theme}@2x.png`
          await shotClip(page, path.join(outDir, cropName), key === 'p0' ? CHIP_P0 : CHIP_P100)
        }
      }

      await page.evaluate(() => {
        const box = document.querySelector('.hero-3d')
        const canvas = box?.querySelector('canvas')
        const poster = box?.querySelector('.hero-3d-poster-host')
        if (canvas) canvas.style.opacity = '0'
        if (poster) poster.style.opacity = '1'
      })
      await page.waitForTimeout(50)
      const posterName = `hero_poster_${vp.name}_${theme}.png`
      await page.locator('.hero-3d').screenshot({
        path: path.join(outDir, posterName),
        animations: 'disabled',
      })
      files.push(posterName)

      const livePath = path.join(outDir, `hero_p100_${vp.name}_${theme}.png`)
      const posterPath = path.join(outDir, posterName)
      const diff = pixelDiff(readFileSync(livePath), readFileSync(posterPath))
      diffs.push({
        viewport: vp.name,
        theme,
        changedPx: diff.changed,
        mae: Number(diff.mae.toFixed(3)),
        size: `${diff.w}x${diff.h}`,
        method: `Playwright 2x screenshot of .hero-3d; RGBA max-channel delta > ${THRESH} counts as changed; MAE over all channels`,
      })

      const liveCrop = `crop_p100_live_${vp.name}_${theme}@2x.png`
      const posterCrop = `crop_p100_poster_${vp.name}_${theme}@2x.png`
      await page.evaluate(() => {
        const box = document.querySelector('.hero-3d')
        const canvas = box?.querySelector('canvas')
        const poster = box?.querySelector('.hero-3d-poster-host')
        if (canvas) canvas.style.opacity = '1'
        if (poster) poster.style.opacity = '0'
      })
      await page.evaluate(() => window.__hero3d.seek(1))
      await page.waitForTimeout(40)
      await shotClip(page, path.join(outDir, liveCrop), CHIP_P100)
      await page.evaluate(() => {
        const box = document.querySelector('.hero-3d')
        const canvas = box?.querySelector('canvas')
        const poster = box?.querySelector('.hero-3d-poster-host')
        if (canvas) canvas.style.opacity = '0'
        if (poster) poster.style.opacity = '1'
      })
      await page.waitForTimeout(40)
      await shotClip(page, path.join(outDir, posterCrop), CHIP_P100)
      const cropDiff = pixelDiff(readFileSync(path.join(outDir, liveCrop)), readFileSync(path.join(outDir, posterCrop)))
      diffs.push({
        viewport: vp.name,
        theme,
        region: 'chip@2x',
        changedPx: cropDiff.changed,
        mae: Number(cropDiff.mae.toFixed(3)),
        size: `${cropDiff.w}x${cropDiff.h}`,
        method: `2x clip of chip bbox in .hero-3d; RGBA max-channel delta > ${THRESH}`,
      })

      await context.close()
    }
  }

  const sheetHtml = path.join(outDir, 'contact-sheet.html')
  const cells = []
  for (const theme of THEMES) {
    for (const vp of VPS) {
      for (const key of ['p0', 'p50', 'p100', 'poster']) {
        const name = key === 'poster' ? `hero_poster_${vp.name}_${theme}.png` : `hero_${key}_${vp.name}_${theme}.png`
        const label = `${key} · ${vp.name} · ${theme}`
        cells.push(
          `<figure><img src="${name}" alt="${label}"/><figcaption>${label}</figcaption></figure>`,
        )
      }
    }
  }
  writeFileSync(
    sheetHtml,
    `<!doctype html><meta charset="utf-8"><title>K1 contact sheet</title>
<style>
  body{margin:16px;background:#111;color:#eee;font:12px/1.3 ui-sans-serif,system-ui}
  h1{font-size:16px;margin:0 0 12px}
  .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
  figure{margin:0;background:#1b1b1b;border:1px solid #333;padding:6px}
  img{width:100%;height:auto;display:block;background:#fff}
  figcaption{margin-top:6px}
</style>
<h1>K1 hero · 16 renders (p0 / p50 / p100 / poster × 1440 / 390 × light / dark)</h1>
<div class="grid">${cells.join('')}</div>`,
  )

  const sheetCtx = await browser.newContext({ viewport: { width: 1600, height: 1400 }, deviceScaleFactor: 1 })
  const sheetPage = await sheetCtx.newPage()
  await sheetPage.goto(`file://${sheetHtml}`)
  await sheetPage.screenshot({ path: path.join(outDir, 'hero_k1_contact_sheet.png'), fullPage: true })
  await sheetCtx.close()
  await browser.close()

  const zipPath = path.join(outDir, 'hero_k1_renders_16.zip')
  const originals = []
  for (const theme of THEMES) {
    for (const vp of VPS) {
      for (const key of ['p0', 'p50', 'p100']) originals.push(`hero_${key}_${vp.name}_${theme}.png`)
      originals.push(`hero_poster_${vp.name}_${theme}.png`)
    }
  }
  execFileSync('zip', ['-q', '-j', zipPath, ...originals.map((f) => path.join(outDir, f))], { cwd: outDir })
  writeFileSync(path.join(outDir, 'pixel-diff.json'), `${JSON.stringify(diffs, null, 2)}\n`)
  console.log(JSON.stringify({ zip: zipPath, files: originals, diffs }, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
