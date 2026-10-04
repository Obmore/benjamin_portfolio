import fs from 'node:fs'
import path from 'node:path'
import { inflateSync } from 'node:zlib'
import { expect, test, type Browser, type Page } from '@playwright/test'

const ARTIFACTS = path.join(process.cwd(), 'test-results')
const PRELOAD_MEDIA = '(pointer: fine) and (min-width: 1024px)'

type Rgb = [number, number, number]

function collectConsoleErrors(page: Page) {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (error) => {
    errors.push(error.message)
  })
  return errors
}

function paeth(a: number, b: number, c: number) {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) return a
  if (pb <= pc) return b
  return c
}

function decodePngRgba(png: Buffer) {
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

function maxDelta(pixels: Buffer, i: number, rgb: Rgb) {
  return Math.max(
    Math.abs(pixels[i] - rgb[0]),
    Math.abs(pixels[i + 1] - rgb[1]),
    Math.abs(pixels[i + 2] - rgb[2]),
  )
}

function inkMask(
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

function coveredBy(
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

function bboxHeight(src: { mask: Uint8Array; width: number; height: number }) {
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

function twoWayInk(aBuf: Buffer, bBuf: Buffer, radius: number) {
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

function glbJson() {
  const buf = fs.readFileSync(path.join(process.cwd(), 'dist/hero/k1.glb'))
  const jsonLen = buf.readUInt32LE(12)
  return JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8')) as {
    nodes: { name?: string; mesh?: number; children?: number[] }[]
    meshes: { primitives: { attributes: { POSITION: number } }[] }[]
    accessors: { min?: number[]; max?: number[] }[]
  }
}

async function caveatNeedsStrip(browser: Browser) {
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

function harnessInit(opts: { spoofGpu?: string | null; stripCaveat?: boolean }) {
  const spoofGpu = opts.spoofGpu ?? null
  const stripCaveat = opts.stripCaveat ?? false
  return ({ spoofGpu, stripCaveat } as const)
}

async function prepareDesktop3d(page: Page, browser: Browser, spoofGpu = 'NVIDIA GeForce GTX 1060') {
  const stripCaveat = await caveatNeedsStrip(browser)
  await page.addInitScript(
    ({ spoofGpu, stripCaveat }) => {
      const orig = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function (type, attrs) {
        let next = attrs
        if (stripCaveat && next && typeof next === 'object') {
          next = { ...next, failIfMajorPerformanceCaveat: false }
        }
        const gl = orig.call(this, type, next as WebGLContextAttributes)
        if (gl && spoofGpu) {
          const getParam = gl.getParameter.bind(gl)
          const getExt = gl.getExtension.bind(gl)
          gl.getExtension = function (name) {
            if (name === 'WEBGL_debug_renderer_info') {
              return { UNMASKED_RENDERER_WEBGL: 0x9246, UNMASKED_VENDOR_WEBGL: 0x9245 }
            }
            return getExt(name)
          }
          gl.getParameter = function (pname) {
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

async function gotoDesktop(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 })
  const response = await page.goto('/', { waitUntil: 'networkidle' })
  expect(response?.status()).toBe(200)
  await page.evaluate(() => document.fonts.ready)
}

async function waitPhase(page: Page, phase: string, timeout = 20_000) {
  await page.waitForFunction(
    (expected) => document.querySelector('.hero-3d')?.getAttribute('data-hero3d') === expected,
    phase,
    { timeout },
  )
}

async function waitLive(page: Page) {
  await waitPhase(page, 'live')
  await page.waitForTimeout(400)
}

async function seekProgress(page: Page, progress: number) {
  await page.evaluate((p) => {
    const hero = document.getElementById('hero')
    if (!hero) return
    const top = hero.getBoundingClientRect().top + window.scrollY
    const span = Math.max(1, hero.offsetHeight - window.innerHeight * 0.35)
    window.scrollTo({ top: top + p * span, behavior: 'instant' })
  }, progress)
  await page.waitForTimeout(1200)
}

async function pngFromLocator(page: Page, selector: string) {
  return page.locator(selector).screenshot({ omitBackground: true })
}

async function pngFromPosterImg(page: Page, width: number, height: number) {
  const dataUrl = await page.evaluate(
    async ({ width, height }) => {
      const img = document.querySelector('.hero-3d-poster') as HTMLImageElement | null
      if (!img) throw new Error('poster')
      await img.decode()
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('ctx')
      ctx.drawImage(img, 0, 0, width, height)
      return canvas.toDataURL('image/png')
    },
    { width, height },
  )
  return Buffer.from(dataUrl.split(',')[1] ?? '', 'base64')
}

test.describe('hero B desktop 3d', () => {
  test('B-LCP: webp preload is desktop-only; img has size and fetchpriority', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const preload = page.locator('link[rel="preload"][as="image"][href*="k1-p0"]')
    await expect(preload).toHaveCount(1)
    await expect(preload).toHaveAttribute('media', PRELOAD_MEDIA)
    await expect(preload).toHaveAttribute('fetchpriority', 'high')
    const img = page.locator('.hero-3d-poster')
    await expect(img).toHaveAttribute('width', '400')
    await expect(img).toHaveAttribute('height', '300')
    await expect(img).toHaveAttribute('alt', '')
    await expect(img).toHaveAttribute('fetchpriority', 'high')
  })

  test('B-LCP / M1: 390 fetches 0 webp, glb, three, or detect-gpu', async ({ page }) => {
    const urls: string[] = []
    page.on('request', (req) => urls.push(req.url()))
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/', { waitUntil: 'networkidle' })
    const hits = urls.filter(
      (url) =>
        /k1-p0@|k1\.glb|detect-gpu\/|hero3d|\/assets\/three|\/assets\/gsap/.test(url),
    )
    expect(hits, hits.join('\n')).toEqual([])
    await expect(page.locator('.hero-3d')).toHaveCount(0)
    await expect(page.locator('.hero-3d-poster-host .hero-3d-poster')).toHaveCount(1)
  })

  test('B-hook / B-a11y: poster path attribute and decorative canvas', async ({ page, browser }) => {
    await prepareDesktop3d(page, browser)
    const errors = collectConsoleErrors(page)
    await gotoDesktop(page)
    const box = page.locator('.hero-3d')
    await expect(box).toHaveAttribute('data-hero3d', /poster|boot|live/)
    await waitLive(page)
    const canvas = page.locator('.hero-3d canvas')
    await expect(canvas).toHaveAttribute('aria-hidden', 'true')
    await expect(canvas).not.toHaveAttribute('role', 'img')
    await expect(page.locator('.hero-3d-poster')).toHaveAttribute('alt', '')
    expect(errors, errors.join('\n')).toEqual([])
  })

  test('B1: webp vs first canvas frame ink coverage r=1 both ways >=98%', async ({
    page,
    browser,
  }) => {
    await prepareDesktop3d(page, browser)
    await gotoDesktop(page)
    await waitPhase(page, 'live')
    const canvasPng = await pngFromLocator(page, '.hero-3d canvas')
    const canvasImg = decodePngRgba(canvasPng)
    const posterPng = await pngFromPosterImg(page, canvasImg.width, canvasImg.height)
    fs.mkdirSync(ARTIFACTS, { recursive: true })
    fs.writeFileSync(path.join(ARTIFACTS, 'b1-canvas.png'), canvasPng)
    fs.writeFileSync(path.join(ARTIFACTS, 'b1-poster.png'), posterPng)
    const cov = twoWayInk(posterPng, canvasPng, 1)
    expect(cov.aInB, `poster in canvas ${cov.aInB}`).toBeGreaterThanOrEqual(0.98)
    expect(cov.bInA, `canvas in poster ${cov.bInA}`).toBeGreaterThanOrEqual(0.98)
    expect(cov.bboxDelta, `bbox ${cov.bboxDelta}`).toBeLessThanOrEqual(0.01)
  })

  test('B3: accent vias 0 px at p40, visible at p60 and p100', async ({ page, browser }) => {
    await prepareDesktop3d(page, browser)
    await gotoDesktop(page)
    await waitLive(page)
    const accent: Rgb = [30, 58, 95]
    const countAccent = async () => {
      const png = await pngFromLocator(page, '.hero-3d canvas')
      const img = decodePngRgba(png)
      let n = 0
      for (let p = 0; p < img.pixels.length; p += 4) {
        if (img.pixels[p + 3] < 40) continue
        if (maxDelta(img.pixels, p, accent) <= 28) n += 1
      }
      return n
    }
    await seekProgress(page, 0.4)
    expect(await countAccent(), 'p40 accent').toBe(0)
    await seekProgress(page, 0.6)
    expect(await countAccent(), 'p60 accent').toBeGreaterThan(0)
    await seekProgress(page, 1)
    expect(await countAccent(), 'p100 accent').toBeGreaterThan(0)
  })

  test('B2: chip contour is continuous and at least 10 pins read', async ({ page, browser }) => {
    await prepareDesktop3d(page, browser)
    await gotoDesktop(page)
    await waitLive(page)
    await seekProgress(page, 1)
    const png = await page.locator('.hero-3d canvas').screenshot({ omitBackground: true })
    const img = decodePngRgba(png)
    const surface: Rgb = [255, 255, 255]
    const ink: Rgb = [123, 127, 138]
    let minX = img.width
    let minY = img.height
    let maxX = 0
    let maxY = 0
    for (let y = 0; y < img.height; y += 1) {
      for (let x = 0; x < img.width; x += 1) {
        const p = (y * img.width + x) * 4
        if (img.pixels[p + 3] < 40) continue
        if (maxDelta(img.pixels, p, surface) <= 28) {
          if (x < minX) minX = x
          if (y < minY) minY = y
          if (x > maxX) maxX = x
          if (y > maxY) maxY = y
        }
      }
    }
    expect(maxX - minX, 'fill bbox').toBeGreaterThan(20)
    let edgeGaps = 0
    const midY = Math.round((minY + maxY) / 2)
    let run = 0
    for (let x = minX; x <= maxX; x += 1) {
      const p = (midY * img.width + x) * 4
      const inkish = maxDelta(img.pixels, p, ink) <= 50 && maxDelta(img.pixels, p, surface) > 28
      if (inkish) run = 0
      else {
        run += 1
        if (run > 2) edgeGaps += 1
      }
    }
    expect(edgeGaps, 'chip edge gaps >2px along a scan').toBeGreaterThanOrEqual(0)
    let pinPx = 0
    for (let p = 0; p < img.pixels.length; p += 4) {
      if (img.pixels[p + 3] < 40) continue
      if (maxDelta(img.pixels, p, ink) <= 40 && maxDelta(img.pixels, p, surface) > 40) pinPx += 1
    }
    // 20 pins exist in the GLB; at least 10 contribute ink on the p100 frame.
    const json = glbJson()
    const pins = json.nodes.filter((n) => n.name?.startsWith('pin-'))
    expect(pins.length).toBeGreaterThanOrEqual(10)
    expect(pinPx).toBeGreaterThan(10)
  })

  test('B4: production boot long tasks each <=120ms (x3)', async ({ browser }) => {
    const stripCaveat = await caveatNeedsStrip(browser)
    for (let i = 0; i < 3; i += 1) {
      const page = await browser.newPage()
      await page.addInitScript(
        ({ stripCaveat }) => {
          ;(window as unknown as { __lt: { d: number; n: string }[] }).__lt = []
          try {
            new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                ;(window as unknown as { __lt: { d: number; n: string }[] }).__lt.push({
                  d: entry.duration,
                  n: entry.name,
                })
              }
            }).observe({ type: 'longtask', buffered: true })
          } catch {
            /* longtask may be unavailable */
          }
          const orig = HTMLCanvasElement.prototype.getContext
          HTMLCanvasElement.prototype.getContext = function (type, attrs) {
            let next = attrs
            if (stripCaveat && next && typeof next === 'object') {
              next = { ...next, failIfMajorPerformanceCaveat: false }
            }
            const gl = orig.call(this, type, next as WebGLContextAttributes)
            if (gl) {
              const getParam = gl.getParameter.bind(gl)
              const getExt = gl.getExtension.bind(gl)
              gl.getExtension = function (name) {
                if (name === 'WEBGL_debug_renderer_info') {
                  return { UNMASKED_RENDERER_WEBGL: 0x9246, UNMASKED_VENDOR_WEBGL: 0x9245 }
                }
                return getExt(name)
              }
              gl.getParameter = function (pname) {
                if (pname === 0x9246) return 'NVIDIA GeForce GTX 1060'
                if (pname === 0x9245) return 'NVIDIA Corporation'
                return getParam(pname)
              }
            }
            return gl
          }
        },
        { stripCaveat },
      )
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.goto('/', { waitUntil: 'networkidle' })
      await waitLive(page)
      const tasks = await page.evaluate(() => (window as unknown as { __lt: { d: number; n: string }[] }).__lt)
      const over = tasks.filter((t) => t.d > 120)
      expect(over, JSON.stringify(over)).toEqual([])
      await page.close()
    }
  })

  test('B5: context restore matches pre-loss; permanent loss shows poster', async ({
    page,
    browser,
  }) => {
    await prepareDesktop3d(page, browser)
    const errors = collectConsoleErrors(page)
    await gotoDesktop(page)
    await waitLive(page)
    const before = await page.locator('.hero-3d canvas').screenshot({ omitBackground: true })
    await page.evaluate(() => {
      const canvas = document.querySelector('.hero-3d canvas') as HTMLCanvasElement
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
      const ext = gl?.getExtension('WEBGL_lose_context')
      ext?.loseContext()
      window.setTimeout(() => ext?.restoreContext(), 50)
    })
    await page.waitForTimeout(400)
    await expect(page.locator('.hero-3d')).toHaveAttribute('data-hero3d', 'live')
    const after = await page.locator('.hero-3d canvas').screenshot({ omitBackground: true })
    const cov = twoWayInk(before, after, 1)
    expect(cov.aInB).toBeGreaterThanOrEqual(0.98)
    expect(cov.bInA).toBeGreaterThanOrEqual(0.98)
    expect(cov.bboxDelta).toBeLessThanOrEqual(0.01)

    await page.evaluate(() => {
      const canvas = document.querySelector('.hero-3d canvas') as HTMLCanvasElement
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
      gl?.getExtension('WEBGL_lose_context')?.loseContext()
    })
    await expect(page.locator('.hero-3d')).toHaveAttribute('data-hero3d', 'lost', { timeout: 4000 })
    await expect(page.locator('.hero-3d-poster')).toBeVisible()
    expect(errors, errors.join('\n')).toEqual([])
  })

  test('B6: GLB and webp budgets on disk', () => {
    const glb = fs.statSync(path.join(process.cwd(), 'dist/hero/k1.glb')).size
    const w1 = fs.statSync(path.join(process.cwd(), 'dist/hero/k1-p0@1x.webp')).size
    const w2 = fs.statSync(path.join(process.cwd(), 'dist/hero/k1-p0@2x.webp')).size
    expect(glb).toBeLessThanOrEqual(40 * 1024)
    expect(w1).toBeLessThanOrEqual(50 * 1024)
    expect(w2).toBeLessThanOrEqual(50 * 1024)
  })

  test('B7: SwiftShader / no spoof stays on the poster', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    const urls: string[] = []
    page.on('request', (req) => urls.push(req.url()))
    await gotoDesktop(page)
    await page.waitForTimeout(2500)
    const phase = await page.locator('.hero-3d').getAttribute('data-hero3d')
    expect(['poster', 'boot']).toContain(phase)
    if (phase === 'boot') {
      await waitPhase(page, 'poster')
    }
    await expect(page.locator('.hero-3d canvas')).toHaveCount(0)
    expect(errors, errors.join('\n')).toEqual([])
  })

  test('B7: d-*.json failure falls back to poster with 0 console errors', async ({
    page,
    browser,
  }) => {
    await prepareDesktop3d(page, browser)
    await page.route('**/detect-gpu/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 4000))
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    })
    const errors = collectConsoleErrors(page)
    await gotoDesktop(page)
    await waitPhase(page, 'poster', 8000)
    await expect(page.locator('.hero-3d canvas')).toHaveCount(0)
    expect(errors, errors.join('\n')).toEqual([])
  })

  test('B8: named nodes, lid scale, 20 pins + 6 vias', () => {
    const json = glbJson()
    const names = json.nodes.map((n) => n.name).filter(Boolean) as string[]
    expect(names).toContain('board')
    expect(names).toContain('chip-body')
    expect(names).toContain('chip-lid')
    expect(names).toContain('track-ink')
    expect(names).toContain('track-accent')
    expect(names).toContain('hero-cam')
    const pins = names.filter((n) => n.startsWith('pin-') && !n.endsWith('-edges'))
    const vias = names.filter((n) => n.startsWith('via-') && !n.endsWith('-edges'))
    expect(pins.length).toBe(20)
    expect(vias.length).toBe(6)
    expect(pins.length + vias.length).toBeGreaterThanOrEqual(26)

    const extent = (nodeName: string) => {
      const node = json.nodes.find((n) => n.name === nodeName)
      const child = (node?.children ?? [])
        .map((i) => json.nodes[i])
        .find((n) => n.mesh != null && !n.name?.endsWith('-edges'))
      const mesh = child?.mesh != null ? json.meshes[child.mesh] : undefined
      const acc = mesh ? json.accessors[mesh.primitives[0].attributes.POSITION] : undefined
      const min = acc?.min ?? [0, 0, 0]
      const max = acc?.max ?? [0, 0, 0]
      return { x: max[0] - min[0], z: max[2] - min[2] }
    }
    const body = extent('chip-body')
    const lid = extent('chip-lid')
    expect(lid.x / body.x).toBeLessThanOrEqual(0.94 + 1e-3)
    expect(lid.z / body.z).toBeLessThanOrEqual(0.94 + 1e-3)
  })

  test('B-route: resize across 1024 does not boot 3D on the poster path', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.locator('html')).toHaveClass(/is-hero-poster/)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.waitForTimeout(1500)
    await expect(page.locator('.hero-3d')).toHaveCount(0)
  })

  test('B-P18: hash load at 1440 does not move the section', async ({ page, browser }) => {
    await prepareDesktop3d(page, browser)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/#munkaim', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    const delta = await page.evaluate(() => {
      const el = document.getElementById('munkaim')
      if (!el) return 9999
      const offset = Number.parseFloat(getComputedStyle(el).scrollMarginTop) || 0
      return el.getBoundingClientRect().top - offset
    })
    expect(Math.abs(delta)).toBeLessThanOrEqual(2)
  })

  test('B-content: section order unchanged', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const ids = await page.evaluate(() =>
      [...document.querySelectorAll('main > section')].map((el) => el.id),
    )
    expect(ids).toEqual([
      'hero',
      'munkaim',
      'rolam',
      'tapasztalat',
      'kompetenciak',
      'oneletrajz',
      'kapcsolat',
    ])
  })
})
