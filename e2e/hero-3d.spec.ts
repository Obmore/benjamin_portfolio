import { expect, test, type Page } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { parseCssColor, twoWayFillCoverage, chipSeeThroughFromPath, decodePngRgba } from '../scripts/k1-coverage-lib.mjs'

async function gotoHome(page: Page, query = '') {
  const response = await page.goto(`/${query}`, { waitUntil: 'domcontentloaded' })
  expect(response?.status()).toBe(200)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForSelector('#hero', { timeout: 8000 })
}

type HeroEnd = {
  x: number
  y: number
  ax: number
  ay: number
  id: string
  targetId: string
  kind: string
}

type Hero3dHook = {
  scene?: { children: { visible: boolean; userData: Record<string, unknown> }[]; traverse: (fn: (o: { userData: Record<string, unknown> }) => void) => void }
  seek?: (p: number) => void
  dispose?: () => void
  qaShiftEnd?: (index: number, px: number) => void
  qaEndWorld?: (index: number) => { x: number; y: number; z: number } | undefined
  forceContextLoss?: () => void
  ends: HeroEnd[]
  progress: number
  layers: number
  dpr: number
  pixelRatio: number
  rafCount: number
  tier: string
  info: { calls: number; memory: { geometries: number; textures: number } }
}

async function waitHero3d(page: Page) {
  await page.waitForFunction(
    () => {
      const box = document.querySelector('.hero-3d')
      const hook = (window as Window & { __hero3d?: Hero3dHook }).__hero3d
      return Boolean(
        box?.classList.contains('is-swapped') && hook?.seek && hook.dispose && hook.qaEndWorld && hook.scene,
      )
    },
    null,
    { timeout: 20000 },
  )
}

test.describe('hero 3D K1', () => {
  test('old circuit and braces are gone; titleblock remains', async ({ page }) => {
    await gotoHome(page)
    await expect(page.locator('.hero-circuit')).toHaveCount(0)
    await expect(page.locator('.hero-signal')).toHaveCount(0)
    await expect(page.locator('.hero-titleblock')).toHaveCount(1)
    await expect(page.locator('.hero-3d .hero-3d-poster')).toHaveCount(1)
    const html = await page.locator('.hero-figure').innerHTML()
    expect(html).not.toMatch(/\{\s*\}/)
    await expect(page.locator('.hero-3d-poster text')).toHaveCount(0)
  })

  test('headline is LCP candidate and stays opaque', async ({ page }) => {
    await gotoHome(page)
    const probe = await page.evaluate(() => {
      const h = document.querySelector('.hero-headline')
      const name = document.querySelector('.hero-name')
      const h1 = document.querySelector('#hero h1')
      if (!h || !name || !h1) return null
      const cs = (el: Element) => getComputedStyle(el)
      return {
        hOp: cs(h).opacity,
        nOp: cs(name).opacity,
        h1Op: cs(h1).opacity,
      }
    })
    expect(probe?.hOp).toBe('1')
    expect(probe?.nOp).toBe('1')
    expect(probe?.h1Op).toBe('1')
  })

  test('titleblock and copy do not overlap the 3D box', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoHome(page)
    const overlap = await page.evaluate(() => {
      const box = document.querySelector('.hero-3d')?.getBoundingClientRect()
      if (!box) return 'missing-3d'
      const hits: string[] = []
      const nodes = [
        ...document.querySelectorAll('.hero-titleblock, .hero-titleblock dt, .hero-titleblock dd'),
        document.querySelector('.hero-name'),
        document.querySelector('.hero-headline'),
        document.querySelector('.hero-sub'),
      ].filter(Boolean) as HTMLElement[]
      for (const el of nodes) {
        const r = el.getBoundingClientRect()
        const ox = Math.max(0, Math.min(box.right, r.right) - Math.max(box.left, r.left))
        const oy = Math.max(0, Math.min(box.bottom, r.bottom) - Math.max(box.top, r.top))
        if (ox * oy > 0.5) hits.push(el.className || el.tagName)
      }
      return hits
    })
    expect(overlap).toEqual([])
  })

  test('reduced-motion keeps the poster and skips three/gsap', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const requests: string[] = []
    page.on('request', (req) => {
      const url = req.url()
      const file = url.split('/').pop() || ''
      if (file.startsWith('three-gate')) return
      if (/^(three|gsap)[-.]/.test(file)) requests.push(url)
    })
    await gotoHome(page, '?qa3d=1')
    await page.waitForTimeout(2500)
    await expect(page.locator('.hero-3d canvas')).toHaveCount(0)
    await expect(page.locator('.hero-3d-poster')).toBeVisible()
    await expect(page.locator('.hero-3d-poster')).toHaveAttribute('data-pose', '100')
    const tier = await page.locator('.hero-3d').getAttribute('data-hero3d-tier')
    expect(tier).toBe('static')
    const hook = await page.evaluate(() => Boolean((window as Window & { __hero3d?: unknown }).__hero3d))
    expect(hook).toBe(false)
    expect(requests).toEqual([])
  })

  test('qa hook is inert without qa3d', async ({ page }) => {
    await gotoHome(page)
    await page.waitForTimeout(500)
    const state = await page.evaluate(() => ({
      hook: (window as Window & { __hero3d?: unknown }).__hero3d,
      attr: document.querySelector('.hero-3d')?.getAttribute('data-hero3d-tier') ?? null,
    }))
    expect(state.hook).toBeUndefined()
    expect(state.attr).toBeNull()
  })

  test('canvas is decorative when 3D loads', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoHome(page, '?qa3d=1')
    const canvas = page.locator('.hero-3d canvas')
    await canvas.waitFor({ state: 'attached', timeout: 20000 })
    await expect(canvas).toHaveAttribute('aria-hidden', 'true')
    const tabIndex = await canvas.evaluate((el) => (el as HTMLCanvasElement).tabIndex)
    expect(tabIndex).toBe(-1)
    const tier = await page.locator('.hero-3d').getAttribute('data-hero3d-tier')
    expect(tier === 'full' || tier === 'lite').toBeTruthy()
  })

  test('mobile box is 4:3 and at most 320px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await gotoHome(page)
    const box = await page.locator('.hero-3d').evaluate((el) => {
      const r = el.getBoundingClientRect()
      return { w: r.width, h: r.height, overflow: document.documentElement.scrollWidth <= window.innerWidth + 1 }
    })
    expect(box.h).toBeLessThanOrEqual(320.5)
    expect(Math.abs(box.w / box.h - 4 / 3)).toBeLessThan(0.08)
    expect(box.overflow).toBe(true)
  })

  for (const vp of [
    { w: 1440, h: 900 },
    { w: 390, h: 844 },
  ]) {
    test(`T3-ends coincide at 100% (${vp.w}x${vp.h} light)`, async ({ page }) => {
      await page.setViewportSize({ width: vp.w, height: vp.h })
      await gotoHome(page, '?qa3d=1')
      await waitHero3d(page)
      await expect(page.locator('.hero-3d-poster')).toHaveCount(1)
      await expect(page.locator('.hero-3d-poster')).toHaveAttribute('data-pose', '100')
      await expect(page.locator('.hero-3d canvas')).toHaveAttribute('data-pose', '0')

      const posterHidden = await page.locator('.hero-3d-poster').evaluate((el) => getComputedStyle(el).visibility)
      expect(posterHidden).toBe('hidden')

      const read = (progress: number) =>
        page.evaluate((p) => {
          const hook = (window as Window & { __hero3d?: Hero3dHook }).__hero3d
          if (!hook) return null
          hook.seek?.(p)
          const ends = hook.ends
          return {
            progress: hook.progress,
            layers: hook.layers,
            n: ends.length,
            ends,
            sample: ends[0],
          }
        }, progress)

      const at0 = await read(0)
      const at50 = await read(0.5)
      const at100 = await read(1)
      expect(at0?.n).toBeGreaterThan(0)
      expect(at50?.n).toBe(at0?.n)
      expect(at100?.n).toBe(at0?.n)
      expect(at0?.sample).toEqual(
        expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
          ax: expect.any(Number),
          ay: expect.any(Number),
          id: expect.any(String),
          targetId: expect.any(String),
          kind: expect.stringMatching(/^(pad|via|pin)$/),
        }),
      )
      expect(at100?.progress).toBeCloseTo(1, 5)
      expect(at100?.layers).toBe(vp.w >= 1440 ? 4 : 3)
      const vis = await page.evaluate(() => {
        const hook = (window as Window & { __hero3d?: Hero3dHook }).__hero3d
        if (!hook?.scene) return null
        const tagged = hook.scene.children.filter((c) => typeof c.userData.layer === 'string')
        const before = hook.layers
        if (!tagged[0]) return { before, tagged: tagged.length }
        tagged[0].visible = false
        const hidden = hook.layers
        tagged[0].visible = true
        const restored = hook.layers
        return { before, hidden, restored, tagged: tagged.length }
      })
      expect(vis?.tagged).toBe(vp.w >= 1440 ? 4 : 3)
      expect(vis?.before).toBe(vis?.tagged)
      expect(vis?.hidden).toBe((vis?.tagged ?? 0) - 1)
      expect(vis?.restored).toBe(vis?.tagged)
      for (const end of at100?.ends ?? []) {
        expect(end.id.length).toBeGreaterThan(0)
        expect(end.targetId).toBe(end.id)
        expect(['pad', 'via', 'pin']).toContain(end.kind)
        expect(Math.abs(end.x - end.ax)).toBeLessThanOrEqual(1)
        expect(Math.abs(end.y - end.ay)).toBeLessThanOrEqual(1)
      }
    })
  }

  test('qaShiftEnd mutates app state so the ±1px check fails', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoHome(page, '?qa3d=1')
    await waitHero3d(page)
    const beforePng = await page.locator('.hero-3d canvas').screenshot({
      animations: 'disabled',
      omitBackground: true,
    })
    const probe = await page.evaluate(() => {
      const hook = (window as Window & { __hero3d?: Hero3dHook }).__hero3d
      if (!hook?.qaShiftEnd || !hook.qaEndWorld) return null
      hook.seek?.(1)
      const before = hook.ends[0]
      const world0 = hook.qaEndWorld(0)
      hook.qaShiftEnd(0, 2)
      const after = hook.ends[0]
      const world1 = hook.qaEndWorld(0)
      const rest = hook.ends.slice(1)
      return {
        before,
        after,
        world0,
        world1,
        restOk: rest.every((e) => Math.abs(e.x - e.ax) <= 1 && Math.abs(e.y - e.ay) <= 1),
      }
    })
    const afterPng = await page.locator('.hero-3d canvas').screenshot({
      animations: 'disabled',
      omitBackground: true,
    })
    expect(probe?.before).toBeTruthy()
    expect(probe?.world0).toEqual(expect.objectContaining({ x: expect.any(Number), y: expect.any(Number), z: expect.any(Number) }))
    expect(Math.abs((probe?.before.x ?? 0) - (probe?.before.ax ?? 0))).toBeLessThanOrEqual(1)
    expect(Math.abs((probe?.after.x ?? 0) - (probe?.after.ax ?? 0))).toBeGreaterThan(1)
    expect(Math.abs((probe?.after.x ?? 0) - (probe?.before.x ?? 0) - 2)).toBeLessThanOrEqual(0.5)
    expect(Math.abs((probe?.after.y ?? 0) - (probe?.before.y ?? 0))).toBeLessThanOrEqual(0.5)
    expect(probe?.restOk).toBe(true)
    expect(
      Math.abs((probe?.world1?.x ?? 0) - (probe?.world0?.x ?? 0)) +
        Math.abs((probe?.world1?.y ?? 0) - (probe?.world0?.y ?? 0)) +
        Math.abs((probe?.world1?.z ?? 0) - (probe?.world0?.z ?? 0)),
    ).toBeGreaterThan(0)
    expect(Buffer.compare(beforePng, afterPng), 'canvas pixels must change after qaShiftEnd').not.toBe(0)
    const beforeImg = decodePngRgba(Buffer.from(beforePng))
    const afterImg = decodePngRgba(Buffer.from(afterPng))
    expect(beforeImg.width).toBe(afterImg.width)
    expect(beforeImg.height).toBe(afterImg.height)
    const { default: pixelmatch } = await import('pixelmatch')
    const diff = pixelmatch(beforeImg.pixels, afterImg.pixels, null, beforeImg.width, beforeImg.height, {
      threshold: 0.1,
    })
    expect(diff, 'qaShiftEnd must change rendered pixels').toBeGreaterThan(0)
  })

  test('poster data-pose is a literal on the cloned SVG', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoHome(page)
    await expect(page.locator('.hero-3d-poster')).toHaveAttribute('data-pose', '100')
  })

  test('watchdog does not trip on the first frame after a scroll pause', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.addInitScript(() => {
      try {
        sessionStorage.removeItem('ob-3d-off')
      } catch {
        /* ignore */
      }
    })
    await gotoHome(page, '?qa3d=1')
    await page.waitForFunction(
      () => {
        const box = document.querySelector('.hero-3d')
        const hook = (window as Window & { __hero3d?: { seek?: (p: number) => void } }).__hero3d
        return Boolean(box?.classList.contains('is-ready') && hook?.seek)
      },
      null,
      { timeout: 20000 },
    )
    await page.waitForTimeout(1300)
    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = 'auto'
    })
    for (const y of [40, 80, 120, 160, 200, 80, 0]) {
      await page.evaluate((top) => window.scrollTo(0, top), y)
      await page.waitForTimeout(80)
    }
    const state = await page.evaluate(() => {
      const box = document.querySelector('.hero-3d')
      return {
        flag: sessionStorage.getItem('ob-3d-off'),
        tier: box?.getAttribute('data-hero3d-tier'),
        ready: box?.classList.contains('is-ready'),
        canvas: Boolean(box?.querySelector('canvas')),
      }
    })
    expect(state.flag).toBeNull()
    expect(state.tier === 'full' || state.tier === 'lite').toBeTruthy()
    expect(state.ready).toBe(true)
    expect(state.canvas).toBe(true)
  })

  test('dispose swap-back fades poster then hides canvas and frees GPU', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoHome(page, '?qa3d=1')
    await waitHero3d(page)
    const started = await page.evaluate(() => {
      const hook = (window as Window & { __hero3d?: Hero3dHook }).__hero3d
      if (!hook?.dispose) return null
      hook.dispose()
      const box = document.querySelector('.hero-3d')
      const poster = document.querySelector('.hero-3d-poster')
      const host = document.querySelector('.hero-3d-poster-host')
      const canvas = document.querySelector('.hero-3d canvas')
      return {
        canvas: Boolean(canvas),
        swapping: box?.classList.contains('is-back') ?? false,
        pose: poster?.getAttribute('data-pose'),
        hostVis: host ? getComputedStyle(host).visibility : null,
        posterVis: poster ? getComputedStyle(poster).visibility : null,
        posterCount: document.querySelectorAll('.hero-3d-poster').length,
      }
    })
    expect(started?.canvas).toBe(true)
    expect(started?.swapping).toBe(true)
    expect(started?.pose).toBe('100')
    expect(started?.hostVis).toBe('visible')
    expect(started?.posterVis).toBe('visible')
    expect(started?.posterCount).toBe(1)

    await page.waitForFunction(() => !document.querySelector('.hero-3d canvas'), null, { timeout: 2000 })
    const after = await page.evaluate(() => {
      const box = document.querySelector('.hero-3d')
      const poster = document.querySelector('.hero-3d-poster')
      const host = document.querySelector('.hero-3d-poster-host')
      const hook = (window as Window & { __hero3d?: Hero3dHook }).__hero3d
      if (!box || !poster || !host || !hook) return null
      const pr = poster.getBoundingClientRect()
      const br = box.getBoundingClientRect()
      return {
        vis: getComputedStyle(poster).visibility,
        hostVis: getComputedStyle(host).visibility,
        op: getComputedStyle(poster).opacity,
        hostOp: getComputedStyle(host).opacity,
        pose: poster.getAttribute('data-pose'),
        dx: Math.abs(pr.left - br.left),
        dy: Math.abs(pr.top - br.top),
        dw: Math.abs(pr.width - br.width),
        dh: Math.abs(pr.height - br.height),
        mem: hook.info.memory,
        posterCount: document.querySelectorAll('.hero-3d-poster').length,
      }
    })
    expect(after?.vis).toBe('visible')
    expect(after?.hostVis).toBe('visible')
    expect(after?.op).toBe('1')
    expect(after?.hostOp).toBe('1')
    expect(after?.pose).toBe('100')
    expect(after?.dx).toBeLessThanOrEqual(0.5)
    expect(after?.dy).toBeLessThanOrEqual(0.5)
    expect(after?.dw).toBeLessThanOrEqual(0.5)
    expect(after?.dh).toBeLessThanOrEqual(0.5)
    expect(after?.mem).toEqual({ geometries: 0, textures: 0 })
    expect(after?.posterCount).toBe(1)
  })

  test('webglcontextlost restores the poster immediately', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoHome(page, '?qa3d=1')
    await waitHero3d(page)
    const probe = await page.evaluate(() => {
      const canvas = document.querySelector('.hero-3d canvas') as HTMLCanvasElement | null
      if (!canvas) return null
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
      gl?.getExtension('WEBGL_lose_context')?.loseContext()
      canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))
      const poster = document.querySelector('.hero-3d-poster')
      const host = document.querySelector('.hero-3d-poster-host')
      const left = document.querySelector('.hero-3d canvas')
      return {
        pose: poster?.getAttribute('data-pose'),
        vis: poster ? getComputedStyle(poster).visibility : null,
        op: poster ? getComputedStyle(poster).opacity : null,
        hostVis: host ? getComputedStyle(host).visibility : null,
        hostOp: host ? getComputedStyle(host).opacity : null,
        canvas: Boolean(left),
        canvasVis: left ? getComputedStyle(left).visibility : 'gone',
        flag: sessionStorage.getItem('ob-3d-off'),
      }
    })
    expect(probe?.pose).toBe('100')
    expect(probe?.vis).toBe('visible')
    expect(probe?.op).toBe('1')
    expect(probe?.hostVis).toBe('visible')
    expect(probe?.hostOp).toBe('1')
    expect(probe?.flag).toBe('1')
    await page.waitForFunction(() => !document.querySelector('.hero-3d canvas'), null, { timeout: 2000 })
    await expect(page.locator('.hero-3d-poster')).toBeVisible()
  })

  test('20x CPU watchdog falls back to the poster within 10s', async ({ page }) => {
    test.setTimeout(45000)
    await page.setViewportSize({ width: 390, height: 844 })
    const client = await page.context().newCDPSession(page)
    await client.send('Emulation.setCPUThrottlingRate', { rate: 20 })
    await page.addInitScript(() => {
      try {
        sessionStorage.removeItem('ob-3d-off')
      } catch {
        /* ignore */
      }
    })
    await gotoHome(page, '?qa3d=1')
    await page.waitForFunction(
      () =>
        sessionStorage.getItem('ob-3d-off') === '1' &&
        document.querySelector('.hero-3d')?.getAttribute('data-hero3d-tier') === 'static',
      null,
      { timeout: 25000 },
    )
    const poster = page.locator('.hero-3d-poster')
    await expect(poster).toBeVisible()
    await expect(poster).toHaveAttribute('data-pose', '100')
    await expect(page.locator('.hero-3d canvas')).toHaveCount(0)
  })

  test('qa3d hook exposes renderer pixelRatio', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    })
    const page = await context.newPage()
    await gotoHome(page, '?qa3d=1')
    await waitHero3d(page)
    const probe = await page.evaluate(() => {
      const hook = (window as Window & { __hero3d?: Hero3dHook }).__hero3d
      const canvas = document.querySelector('.hero-3d canvas') as HTMLCanvasElement | null
      const box = document.querySelector('.hero-3d') as HTMLElement | null
      return {
        pixelRatio: hook?.pixelRatio,
        dpr: hook?.dpr,
        backing: canvas && box ? canvas.width / Math.max(1, box.clientWidth) : null,
        tier: hook?.tier,
      }
    })
    expect(probe?.tier).toBe('lite')
    expect(probe?.pixelRatio).toBeCloseTo(1.25, 5)
    expect(probe?.dpr).toBeCloseTo(1.25, 5)
    expect(probe?.backing).toBeCloseTo(1.25, 5)
    await context.close()
  })

  test('full tier caps pixelRatio at 1.5', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    })
    const page = await context.newPage()
    await gotoHome(page, '?qa3d=1')
    await waitHero3d(page)
    const probe = await page.evaluate(() => {
      const hook = (window as Window & { __hero3d?: Hero3dHook }).__hero3d
      return { pixelRatio: hook?.pixelRatio, tier: hook?.tier }
    })
    expect(probe?.tier).toBe('full')
    expect(probe?.pixelRatio).toBeCloseTo(1.5, 5)
    await context.close()
  })

  test('idle rafCount does not climb after swap', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoHome(page, '?qa3d=1')
    await waitHero3d(page)
    const before = await page.evaluate(() => (window as Window & { __hero3d?: Hero3dHook }).__hero3d?.rafCount)
    await page.waitForTimeout(400)
    const after = await page.evaluate(() => (window as Window & { __hero3d?: Hero3dHook }).__hero3d?.rafCount)
    expect(after).toBe(before)
  })

  test('4x CPU is lite 10/10; 20x CPU is static 10/10', async ({ browser }) => {
    test.setTimeout(180000)
    const run = async (rate: number, w: number, h: number) => {
      const context = await browser.newContext({ viewport: { width: w, height: h } })
      const page = await context.newPage()
      const client = await context.newCDPSession(page)
      await client.send('Emulation.setCPUThrottlingRate', { rate })
      await page.addInitScript(() => {
        try {
          sessionStorage.removeItem('ob-3d-off')
        } catch {
          /* ignore */
        }
      })
      await gotoHome(page, '?qa3d=1')
      if (rate >= 20) {
        await page.waitForFunction(
          () =>
            sessionStorage.getItem('ob-3d-off') === '1' &&
            document.querySelector('.hero-3d')?.getAttribute('data-hero3d-tier') === 'static',
          null,
          { timeout: 25000 },
        )
      } else {
        await page.waitForFunction(
          () => document.querySelector('.hero-3d')?.getAttribute('data-hero3d-tier') === 'lite',
          null,
          { timeout: 25000 },
        )
      }
      const tier = await page.locator('.hero-3d').getAttribute('data-hero3d-tier')
      await context.close()
      return tier
    }
    const lite390: string[] = []
    const lite1440: string[] = []
    const statics: string[] = []
    for (let i = 0; i < 10; i += 1) lite390.push((await run(4, 390, 844)) || '')
    for (let i = 0; i < 10; i += 1) lite1440.push((await run(4, 1440, 900)) || '')
    for (let i = 0; i < 10; i += 1) statics.push((await run(20, 390, 844)) || '')
    expect(lite390, '4x 390').toEqual(Array(10).fill('lite'))
    expect(lite1440, '4x 1440').toEqual(Array(10).fill('lite'))
    expect(statics, '20x 390').toEqual(Array(10).fill('static'))
  })

  test('without WebGL three never loads and there is no console.error', async ({ page }) => {
    const errors: string[] = []
    const threeUrls: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    page.on('request', (req) => {
      const url = req.url()
      const file = url.split('/').pop() || ''
      if (file.startsWith('three-gate')) return
      if (/^(three|three-hero|view-manager)[-.]/.test(file) || /node_modules\/three/.test(url)) {
        threeUrls.push(url)
      }
    })
    await page.addInitScript(() => {
      const orig = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        if (String(type).toLowerCase().includes('webgl')) return null
        return orig.call(this, type, ...rest) as RenderingContext | null
      } as typeof HTMLCanvasElement.prototype.getContext
    })
    await gotoHome(page, '?qa3d=1')
    await page.waitForTimeout(3500)
    expect(threeUrls).toEqual([])
    expect(errors).toEqual([])
    await expect(page.locator('.hero-3d canvas')).toHaveCount(0)
    await expect(page.locator('.hero-3d-poster')).toBeVisible()
  })

  test('ctxlost at 390 4x has 0 empty hero frames', async ({ page }) => {
    test.setTimeout(45000)
    await page.setViewportSize({ width: 390, height: 844 })
    const client = await page.context().newCDPSession(page)
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    await gotoHome(page, '?qa3d=1')
    await waitHero3d(page)
    const box = page.locator('.hero-3d')
    const frames: Buffer[] = []
    const grab = async () => {
      frames.push(await box.screenshot({ animations: 'disabled' }))
    }
    await grab()
    const empty = await page.evaluate(async () => {
      const samples: { empty: boolean; canvas: boolean; poster: boolean }[] = []
      const hostBox = document.querySelector('.hero-3d') as HTMLElement | null
      const read = () => {
        const canvas = hostBox?.querySelector('canvas') as HTMLCanvasElement | null
        const host = hostBox?.querySelector('.hero-3d-poster-host') as HTMLElement | null
        const poster = hostBox?.querySelector('.hero-3d-poster') as SVGElement | null
        const cs = (el: Element | null) => (el ? getComputedStyle(el) : null)
        const vis = (el: Element | null) => {
          const s = cs(el)
          if (!el || !s) return false
          return s.visibility !== 'hidden' && Number(s.opacity) > 0.05
        }
        const canvasOn = vis(canvas)
        const posterOn = vis(host) || vis(poster)
        return { empty: !canvasOn && !posterOn, canvas: canvasOn, poster: posterOn }
      }
      let running = true
      const tick = () => {
        if (!running) return
        samples.push(read())
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
      await new Promise((r) => requestAnimationFrame(() => r(null)))
      const hook = (window as Window & { __hero3d?: { forceContextLoss?: () => void } }).__hero3d
      hook?.forceContextLoss?.()
      await new Promise((r) => setTimeout(r, 120))
      running = false
      return {
        n: samples.length,
        empty: samples.filter((s) => s.empty).length,
        samples: samples.slice(0, 20),
      }
    })
    expect(empty.empty, JSON.stringify(empty)).toBe(0)
    for (let i = 0; i < 8; i += 1) {
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))))
      await grab()
    }
    expect(frames.length).toBeGreaterThan(4)
    for (const png of frames) {
      expect(png.byteLength).toBeGreaterThan(200)
      const img = decodePngRgba(png)
      let marked = 0
      for (let i = 3; i < img.pixels.length; i += 4) {
        if (img.pixels[i] > 8) marked += 1
      }
      expect(marked, 'ctxlost frame must not be empty').toBeGreaterThan(80)
    }
  })

  test('LCP observer does not warn about getEntriesByType', async ({ page }) => {
    const warnings: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'warning' || msg.type() === 'error') warnings.push(msg.text())
    })
    await gotoHome(page, '?qa3d=1')
    await page.waitForTimeout(1500)
    expect(warnings.filter((w) => /getEntriesByType|largest-contentful-paint|deprecated/i.test(w))).toEqual([])
  })

  test('baked poster has exact DPR stroke media queries and no text nodes', async ({ page }) => {
    await gotoHome(page)
    const probe = await page.evaluate(() => {
      const svg = document.querySelector('.hero-3d-poster')
      const style = svg?.querySelector('style')?.textContent || ''
      return {
        style,
        text: svg?.querySelectorAll('text, tspan, foreignObject').length ?? -1,
        chip: Boolean(svg?.querySelector('path.k1-chip')),
      }
    })
    expect(probe.text).toBe(0)
    expect(probe.chip).toBe(true)
    expect(probe.style).toContain('@media (min-resolution:1.25dppx){.k1-ink,.k1-accent{stroke-width:.8}}')
    expect(probe.style).toContain(
      '@media (min-width:900px) and (min-resolution:1.5dppx){.k1-ink,.k1-accent{stroke-width:.667}}',
    )
  })

  test('lite draw calls stay at or under 3', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await gotoHome(page, '?qa3d=1')
    await page.waitForFunction(
      () => Boolean((window as Window & { __hero3d?: { seek?: (p: number) => void } }).__hero3d?.seek),
      null,
      { timeout: 20000 },
    )
    const probe = await page.evaluate(() => {
      const hook = (
        window as Window & {
          __hero3d?: { seek: (n: number) => void; info: { calls: number }; tier: string }
        }
      ).__hero3d
      if (!hook) return null
      hook.seek(1)
      return { calls: hook.info.calls, tier: hook.tier }
    })
    expect(probe?.tier).toBe('lite')
    expect(probe?.calls).toBeLessThanOrEqual(3)
    expect(probe?.calls).toBeGreaterThan(0)
  })

  test('full draw calls stay at or under 12', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoHome(page, '?qa3d=1')
    await page.waitForFunction(
      () => Boolean((window as Window & { __hero3d?: { seek?: (p: number) => void } }).__hero3d?.seek),
      null,
      { timeout: 20000 },
    )
    const probe = await page.evaluate(() => {
      const hook = (
        window as Window & {
          __hero3d?: { seek: (n: number) => void; info: { calls: number }; tier: string }
        }
      ).__hero3d
      if (!hook) return null
      hook.seek(1)
      return { calls: hook.info.calls, tier: hook.tier }
    })
    expect(probe?.tier).toBe('full')
    expect(probe?.calls).toBeLessThanOrEqual(12)
  })

  test('ui-chip color-contrast is 0 at 1440 on the skills cards', async ({ page }) => {
    const { default: AxeBuilder } = await import('@axe-core/playwright')
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoHome(page, '?qa3d=1')
    await page.waitForFunction(
      () => document.querySelector('.hero-3d')?.classList.contains('is-ready'),
      null,
      { timeout: 20000 },
    )
    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = 'auto'
      document.getElementById('kompetenciak')?.scrollIntoView()
    })
    await page.waitForTimeout(400)
    const fourth = page.locator('#kompetenciak .card-elev').nth(3)
    await fourth.scrollIntoViewIfNeeded()
    const axe = await new AxeBuilder({ page }).include('#kompetenciak').withRules(['color-contrast']).analyze()
    const chipHits = axe.violations.flatMap((v) =>
      v.nodes.filter((n) => n.html.includes('ui-chip') || n.target.some((t) => String(t).includes('ui-chip'))),
    )
    expect(chipHits, JSON.stringify(axe.violations, null, 2)).toEqual([])
  })

  test('page-load long tasks stay under 120 ms at 390 reduced-motion', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const client = await page.context().newCDPSession(page)
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    await page.addInitScript(() => {
      const w = window as Window & { __lt: { d: number; t: number }[] }
      w.__lt = []
      try {
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) w.__lt.push({ d: e.duration, t: e.startTime })
        }).observe({ type: 'longtask', buffered: true })
      } catch {
        /* ignore */
      }
    })
    await gotoHome(page)
    await page.waitForFunction(
      () => document.readyState === 'complete' && document.querySelector('#hero'),
      null,
      { timeout: 30000 },
    )
    await page.waitForTimeout(1500)
    const probe = await page.evaluate(() => {
      const w = window as Window & { __lt?: { d: number; t: number }[] }
      const tasks = w.__lt ?? []
      const max = Math.max(0, ...tasks.map((e) => e.d))
      return { max, n: tasks.length, tasks: [...tasks].sort((a, b) => b.d - a.d).slice(0, 8) }
    })
    console.log('LONG_TASK_NAV_START', 'reduced-motion', JSON.stringify(probe))
    expect(probe.max, JSON.stringify(probe.tasks)).toBeLessThanOrEqual(120)
  })

  for (const query of ['?qa3d=1', ''] as const) {
    test(`page-load long tasks stay under 120 ms at 390 from navigation start (${query || 'default'})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      const client = await page.context().newCDPSession(page)
      await client.send('Emulation.setCPUThrottlingRate', { rate: 4 })
      await page.addInitScript(() => {
        const w = window as Window & { __lt: { d: number; t: number }[] }
        w.__lt = []
        try {
          new PerformanceObserver((list) => {
            for (const e of list.getEntries()) w.__lt.push({ d: e.duration, t: e.startTime })
          }).observe({ type: 'longtask', buffered: true })
        } catch {
          /* ignore */
        }
      })
      await gotoHome(page, query)
      await page.waitForFunction(
        () => document.querySelector('.hero-3d')?.classList.contains('is-ready'),
        null,
        { timeout: 30000 },
      )
      await page.waitForTimeout(800)
      const probe = await page.evaluate(() => {
        const w = window as Window & { __lt?: { d: number; t: number }[] }
        const tasks = w.__lt ?? []
        const max = Math.max(0, ...tasks.map((e) => e.d))
        return { max, n: tasks.length, tasks: [...tasks].sort((a, b) => b.d - a.d).slice(0, 8) }
      })
      console.log('LONG_TASK_NAV_START', query || 'default', JSON.stringify(probe))
      expect(probe.max, JSON.stringify(probe.tasks)).toBeLessThanOrEqual(120)
    })
  }

  test('390 LCP with WebGL stays within 10% of reduced-motion LCP', async ({ browser }) => {
    test.setTimeout(120000)
    const collect = async (reduced: boolean, query: string) => {
      const samples: number[] = []
      for (let i = 0; i < 5; i += 1) {
        const context = await browser.newContext({
          viewport: { width: 390, height: 844 },
          reducedMotion: reduced ? 'reduce' : 'no-preference',
        })
        const p = await context.newPage()
        const client = await context.newCDPSession(p)
        await client.send('Network.enable')
        await client.send('Network.setCacheDisabled', { cacheDisabled: true })
        await client.send('Emulation.setCPUThrottlingRate', { rate: 4 })
        await p.addInitScript(() => {
          const w = window as Window & { __lcp: number | null }
          w.__lcp = null
          try {
            new PerformanceObserver((list) => {
              for (const e of list.getEntries()) w.__lcp = e.startTime
            }).observe({ type: 'largest-contentful-paint', buffered: true })
          } catch {
            /* ignore */
          }
        })
        await p.goto(`/${query}`, { waitUntil: 'domcontentloaded' })
        await p.waitForFunction(() => (window as Window & { __lcp: number | null }).__lcp != null, null, {
          timeout: 30000,
        })
        await p.waitForTimeout(400)
        const lcp = await p.evaluate(() => (window as Window & { __lcp: number | null }).__lcp)
        if (!reduced) {
          await p.waitForFunction(
            () => document.querySelector('.hero-3d')?.classList.contains('is-ready'),
            null,
            { timeout: 30000 },
          )
        }
        await context.close()
        if (lcp != null) samples.push(lcp)
      }
      samples.sort((a, b) => a - b)
      const mid = Math.floor(samples.length / 2)
      return samples.length % 2 ? samples[mid] : (samples[mid - 1] + samples[mid]) / 2
    }

    const rm = await collect(true, '')
    const qa = await collect(false, '?qa3d=1')
    const live = await collect(false, '')
    expect(rm, 'reduced-motion LCP').toBeTruthy()
    expect(qa, 'qa3d LCP').toBeTruthy()
    expect(live, 'default LCP').toBeTruthy()
    expect(Math.abs(qa! / rm! - 1), `qa3d LCP ${qa} vs RM ${rm}`).toBeLessThanOrEqual(0.1)
    expect(Math.abs(live! / rm! - 1), `default LCP ${live} vs RM ${rm}`).toBeLessThanOrEqual(0.1)
  })

  for (const cfg of [
    { w: 390, h: 844, dsf: 2, theme: 'light' as const },
    { w: 390, h: 844, dsf: 2, theme: 'dark' as const },
    { w: 1440, h: 900, dsf: 1, theme: 'light' as const },
    { w: 1440, h: 900, dsf: 1, theme: 'dark' as const },
  ]) {
    test(`p100 vs poster two-way fill coverage ${cfg.w}@${cfg.dsf}x ${cfg.theme}`, async ({
      browser,
    }) => {
      const context = await browser.newContext({
        viewport: { width: cfg.w, height: cfg.h },
        deviceScaleFactor: cfg.dsf,
        colorScheme: cfg.theme === 'dark' ? 'dark' : 'light',
      })
      const page = await context.newPage()
      await page.addInitScript((theme) => {
        try {
          localStorage.setItem('theme', theme)
          sessionStorage.removeItem('ob-3d-off')
        } catch {
          /* ignore */
        }
      }, cfg.theme)
      await gotoHome(page, '?qa3d=1')
      await waitHero3d(page)
      await page.locator('.hero-3d').evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'nearest' }))
      await page.waitForTimeout(50)
      await page.evaluate((theme) => {
        document.documentElement.dataset.theme = theme
        document.documentElement.style.colorScheme = theme
      }, cfg.theme)
      await page.evaluate(() => {
        const hook = (window as Window & { __hero3d?: Hero3dHook }).__hero3d
        hook?.seek?.(1)
      })
      await page.waitForTimeout(80)

      const tokens = await page.evaluate(() => {
        const css = getComputedStyle(document.documentElement)
        const pathEl = document.querySelector('.hero-3d-poster path.k1-chip')
        const svg = pathEl?.ownerSVGElement
        const vb = svg?.viewBox?.baseVal
        return {
          surface: css.getPropertyValue('--color-surface').trim(),
          ink: css.getPropertyValue('--color-ink').trim() || css.getPropertyValue('--color-foreground').trim(),
          chipD: pathEl?.getAttribute('d') || '',
          viewW: vb?.width || 320,
          viewH: vb?.height || 240,
        }
      })

      const show = async (live: boolean) => {
        await page.evaluate((on) => {
          const box = document.querySelector('.hero-3d')
          const canvas = box?.querySelector('canvas') as HTMLCanvasElement | null
          const host = box?.querySelector('.hero-3d-poster-host') as HTMLElement | null
          if (canvas) {
            canvas.style.opacity = on ? '1' : '0'
            canvas.style.visibility = on ? 'visible' : 'hidden'
            canvas.style.transitionDuration = '0ms'
          }
          if (host) {
            host.style.opacity = on ? '0' : '1'
            host.style.visibility = on ? 'hidden' : 'visible'
            host.style.transitionDuration = '0ms'
          }
        }, live)
        await page.waitForTimeout(40)
      }

      await show(true)
      const livePng = await page.locator('.hero-3d canvas').screenshot({
        animations: 'disabled',
        omitBackground: true,
      })
      await show(false)
      const posterPng = await page.locator('.hero-3d-poster').screenshot({
        animations: 'disabled',
        omitBackground: true,
      })

      const outDir = path.join(process.cwd(), 'test-results', 'hero-k1-coverage')
      mkdirSync(outDir, { recursive: true })
      const stem = `p100_vs_poster_${cfg.w}_${cfg.theme}`
      writeFileSync(path.join(outDir, `${stem}_live.png`), livePng)
      writeFileSync(path.join(outDir, `${stem}_poster.png`), posterPng)

      const cov = twoWayFillCoverage(
        Buffer.from(livePng),
        Buffer.from(posterPng),
        parseCssColor(tokens.surface),
        parseCssColor(tokens.ink),
        1,
      )
      const chip = chipSeeThroughFromPath(
        Buffer.from(livePng),
        tokens.chipD,
        tokens.viewW,
        tokens.viewH,
        parseCssColor(tokens.surface),
        2,
      )
      console.log('K1_COVERAGE', `${cfg.w}@${cfg.dsf}x`, cfg.theme, JSON.stringify({ cov, chip }))
      expect(cov.aFill, JSON.stringify(cov)).toBeGreaterThan(20)
      expect(cov.bFill, JSON.stringify(cov)).toBeGreaterThan(20)
      expect(cov.aInB, `live-in-poster ${JSON.stringify(cov)}`).toBeGreaterThanOrEqual(0.99)
      expect(cov.bInA, `poster-in-live ${JSON.stringify(cov)}`).toBeGreaterThanOrEqual(0.99)
      expect(chip.interior, `chip interior ${JSON.stringify(chip)}`).toBeGreaterThan(20)
      expect(chip.seeThrough, `chip see-through ${JSON.stringify(chip)}`).toBeLessThanOrEqual(4)
      await context.close()
    })
  }
})
