import fs from 'node:fs'
import path from 'node:path'
import { inflateSync } from 'node:zlib'
import { expect, type Browser, type Page } from '@playwright/test'


type Rgb = [number, number, number]

export function collectConsoleErrors(page: Page) {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (error) => {
    errors.push(error.message)
  })
  return errors
}

export function paeth(a: number, b: number, c: number) {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) return a
  if (pb <= pc) return b
  return c
}

export function decodePngRgba(png: Buffer) {
  if (png.subarray(1, 4).toString('ascii') !== 'PNG') throw new Error('not png')
  let offset = 8
  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = 0
  const chunks: Buffer[] = []
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
      else throw new Error(`png filter ${filter}`)
    }
    for (let x = 0; x < width; x += 1) {
      const o = (y * width + x) * 4
      const i = x * bpp
      pixels[o] = row[i]
      pixels[o + 1] = row[i + 1]
      pixels[o + 2] = row[i + 2]
      pixels[o + 3] = bpp === 4 ? row[i + 3] : 255
    }
    prev = row
  }
  return { width, height, pixels }
}

export function maxDelta(pixels: Buffer, i: number, rgb: Rgb) {
  return Math.max(
    Math.abs(pixels[i] - rgb[0]),
    Math.abs(pixels[i + 1] - rgb[1]),
    Math.abs(pixels[i + 2] - rgb[2]),
  )
}

export function inkMask(
  img: { width: number; height: number; pixels: Buffer },
  ink: Rgb,
  accent: Rgb,
  surface: Rgb,
) {
  const mask = new Uint8Array(img.width * img.height)
  let count = 0
  for (let i = 0, p = 0; i < mask.length; i += 1, p += 4) {
    if (img.pixels[p + 3] < 40) continue
    if (maxDelta(img.pixels, p, surface) <= 28) continue
    const inkish = maxDelta(img.pixels, p, ink) <= 48 || maxDelta(img.pixels, p, accent) <= 48
    if (!inkish) continue
    mask[i] = 1
    count += 1
  }
  return { mask, count, width: img.width, height: img.height }
}

export function coveredBy(
  src: { mask: Uint8Array; count: number; width: number; height: number },
  dst: { mask: Uint8Array },
  radius: number,
) {
  if (src.count === 0) return 1
  let hit = 0
  for (let y = 0; y < src.height; y += 1) {
    for (let x = 0; x < src.width; x += 1) {
      const i = y * src.width + x
      if (!src.mask[i]) continue
      let ok = false
      const y0 = Math.max(0, y - radius)
      const y1 = Math.min(src.height - 1, y + radius)
      const x0 = Math.max(0, x - radius)
      const x1 = Math.min(src.width - 1, x + radius)
      for (let yy = y0; yy <= y1 && !ok; yy += 1) {
        for (let xx = x0; xx <= x1; xx += 1) {
          if (dst.mask[yy * src.width + xx]) ok = true
        }
      }
      if (ok) hit += 1
    }
  }
  return hit / src.count
}

export function bboxHeight(src: { mask: Uint8Array; width: number; height: number }) {
  let minY = src.height
  let maxY = -1
  for (let y = 0; y < src.height; y += 1) {
    for (let x = 0; x < src.width; x += 1) {
      if (!src.mask[y * src.width + x]) continue
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  return maxY >= minY ? maxY - minY + 1 : 0
}

export function twoWayInk(aBuf: Buffer, bBuf: Buffer, radius: number) {
  const ink: Rgb = [123, 127, 138]
  const accent: Rgb = [30, 58, 95]
  const surface: Rgb = [255, 255, 255]
  const a = decodePngRgba(aBuf)
  const b = decodePngRgba(bBuf)
  const w = Math.min(a.width, b.width)
  const h = Math.min(a.height, b.height)
  const clip = (img: typeof a) => {
    if (img.width === w && img.height === h) return img
    const pixels = Buffer.alloc(w * h * 4)
    for (let y = 0; y < h; y += 1) {
      pixels.set(img.pixels.subarray(y * img.width * 4, y * img.width * 4 + w * 4), y * w * 4)
    }
    return { width: w, height: h, pixels }
  }
  const ca = clip(a)
  const cb = clip(b)
  const ma = inkMask(ca, ink, accent, surface)
  const mb = inkMask(cb, ink, accent, surface)
  const ha = bboxHeight(ma)
  const hb = bboxHeight(mb)
  return {
    aInB: coveredBy(ma, mb, radius),
    bInA: coveredBy(mb, ma, radius),
    bboxDelta: ha && hb ? Math.abs(ha - hb) / Math.max(ha, hb) : 1,
    aCount: ma.count,
    bCount: mb.count,
  }
}

export function glbJson() {
  const buf = fs.readFileSync(path.join(process.cwd(), 'dist/hero/k1.glb'))
  const jsonLen = buf.readUInt32LE(12)
  return JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8')) as {
    nodes: { name?: string; mesh?: number; children?: number[]; scale?: number[] }[]
    meshes: { primitives: { attributes: { POSITION: number } }[] }[]
    accessors: { min?: number[]; max?: number[]; normalized?: boolean; componentType?: number }[]
  }
}

export async function caveatNeedsStrip(browser: Browser) {
  const page = await browser.newPage()
  const need = await page.evaluate(() => {
    const c = document.createElement('canvas')
    const gl =
      c.getContext('webgl2', { failIfMajorPerformanceCaveat: true }) ||
      c.getContext('webgl', { failIfMajorPerformanceCaveat: true })
    return !gl
  })
  await page.close()
  return need
}

export function harnessInit(opts: { spoofGpu?: string | null; stripCaveat?: boolean }) {
  const spoofGpu = opts.spoofGpu ?? null
  const stripCaveat = opts.stripCaveat ?? false
  return ({ spoofGpu, stripCaveat } as const)
}

export async function prepareDesktop3d(page: Page, browser: Browser, spoofGpu = 'NVIDIA GeForce GTX 1060') {
  const stripCaveat = await caveatNeedsStrip(browser)
  await page.addInitScript(
    ({ spoofGpu, stripCaveat }) => {
      const orig = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function (type, attrs) {
        const isGl = type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl'
        if (!isGl) return orig.call(this, type, attrs)
        let next = attrs
        if (stripCaveat && next && typeof next === 'object') {
          next = { ...next, failIfMajorPerformanceCaveat: false }
        }
        const gl = orig.call(this, type, next as WebGLContextAttributes)
        if (gl && spoofGpu && 'getParameter' in gl) {
          const webgl = gl as WebGLRenderingContext
          const getParam = webgl.getParameter.bind(webgl)
          const getExt = webgl.getExtension.bind(webgl)
          webgl.getExtension = function (name) {
            if (name === 'WEBGL_debug_renderer_info') {
              return { UNMASKED_RENDERER_WEBGL: 0x9246, UNMASKED_VENDOR_WEBGL: 0x9245 }
            }
            return getExt(name)
          }
          webgl.getParameter = function (pname) {
            if (pname === 0x9246) return spoofGpu
            if (pname === 0x9245) return 'NVIDIA Corporation'
            return getParam(pname)
          }
        }
        return gl
      }
    },
    harnessInit({ spoofGpu, stripCaveat }),
  )
  return stripCaveat
}

export async function gotoDesktop(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 })
  const response = await page.goto('/', { waitUntil: 'networkidle' })
  expect(response?.status()).toBe(200)
  await page.evaluate(() => document.fonts.ready)
}

export async function waitPhase(page: Page, phase: string, timeout = 20_000) {
  await page.waitForFunction(
    (expected) => document.querySelector('.hero-3d')?.getAttribute('data-hero3d') === expected,
    phase,
    { timeout },
  )
}

export async function waitLive(page: Page) {
  await waitPhase(page, 'live')
  await page.waitForTimeout(400)
}

export async function seekProgress(page: Page, progress: number) {
  await page.evaluate((p) => {
    document.documentElement.style.scrollBehavior = 'auto'
    const hero = document.getElementById('hero')
    if (!hero) return
    const top = hero.getBoundingClientRect().top + window.scrollY
    const span = Math.max(1, hero.offsetHeight - window.innerHeight * 0.35)
    window.scrollTo(0, top + p * span)
  }, progress)
  await page.waitForTimeout(1000)
}

export async function screenshotCanvas(page: Page) {
  await page.locator('.site-header').evaluate((el) => {
    el.style.visibility = 'hidden'
  })
  const bounds = await page.locator('.hero-3d canvas').boundingBox()
  if (!bounds) throw new Error('missing canvas')
  const scrollY = await page.evaluate(() => window.scrollY)
  const png = await page.screenshot({ fullPage: true, clip: { ...bounds, y: bounds.y + scrollY }, omitBackground: true })
  await page.locator('.site-header').evaluate((el) => {
    el.style.visibility = ''
  })
  return png
}

export async function screenshotPoster(page: Page) {
  await page.evaluate(() => {
    const header = document.querySelector('.site-header') as HTMLElement | null
    const canvas = document.querySelector('.hero-3d canvas') as HTMLElement | null
    const img = document.querySelector('.hero-3d-poster') as HTMLElement | null
    if (header) header.style.visibility = 'hidden'
    if (canvas) canvas.style.visibility = 'hidden'
    img?.classList.remove('is-done')
    if (img) img.style.visibility = 'visible'
  })
  const png = await page.locator('.hero-3d-poster').screenshot({ omitBackground: true })
  await page.evaluate(() => {
    const header = document.querySelector('.site-header') as HTMLElement | null
    const canvas = document.querySelector('.hero-3d canvas') as HTMLElement | null
    if (header) header.style.visibility = ''
    if (canvas) canvas.style.visibility = ''
  })
  return png
}

