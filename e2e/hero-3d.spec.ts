import { expect, test, type Page } from '@playwright/test'

async function gotoHome(page: Page, query = '') {
  const response = await page.goto(`/${query}`, { waitUntil: 'domcontentloaded' })
  expect(response?.status()).toBe(200)
  await page.evaluate(() => document.fonts.ready)
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
      if (/\/assets\/(three|gsap)[^/]*\.js$/.test(url)) requests.push(url)
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
    await canvas.waitFor({ state: 'attached', timeout: 8000 })
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
      await page.waitForFunction(
        () => {
          const box = document.querySelector('.hero-3d')
          const hook = (window as Window & { __hero3d?: { seek?: (p: number) => void } }).__hero3d
          return Boolean(box?.classList.contains('is-ready') && hook?.seek)
        },
        null,
        { timeout: 15000 },
      )
      await expect(page.locator('.hero-3d-poster')).toHaveAttribute('data-pose', '100')
      await expect(page.locator('.hero-3d canvas')).toHaveAttribute('data-pose', '0')

      type End = { x: number; y: number; ax: number; ay: number; id: string; kind: string }
      const read = (progress: number) =>
        page.evaluate((p) => {
          const hook = (
            window as Window & {
              __hero3d?: { seek: (n: number) => void; ends: End[]; progress: number }
            }
          ).__hero3d
          if (!hook) return null
          hook.seek(p)
          const ends = hook.ends
          return {
            progress: hook.progress,
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
          kind: expect.stringMatching(/^(pad|via|pin)$/),
        }),
      )
      expect(at100?.progress).toBeCloseTo(1, 5)
      for (const end of at100?.ends ?? []) {
        expect(end.id.length).toBeGreaterThan(0)
        expect(['pad', 'via', 'pin']).toContain(end.kind)
        expect(Math.abs(end.x - end.ax)).toBeLessThanOrEqual(1)
        expect(Math.abs(end.y - end.ay)).toBeLessThanOrEqual(1)
      }
    })
  }

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

  test('dispose frees every geometry and texture', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoHome(page, '?qa3d=1')
    await page.waitForFunction(
      () => Boolean((window as Window & { __hero3d?: { dispose?: () => void } }).__hero3d?.dispose),
      null,
      { timeout: 20000 },
    )
    const mem = await page.evaluate(() => {
      const hook = (
        window as Window & {
          __hero3d?: { dispose: () => void; info: { memory: { geometries: number; textures: number } } }
        }
      ).__hero3d
      if (!hook) return null
      hook.dispose()
      return hook.info.memory
    })
    expect(mem).toEqual({ geometries: 0, textures: 0 })
    await expect(page.locator('.hero-3d canvas')).toHaveCount(0)
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

  test('page-load long tasks stay under 120 ms at 390 from navigation start', async ({ page }) => {
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
    await gotoHome(page, '?qa3d=1')
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
    expect(probe.max, JSON.stringify(probe.tasks)).toBeLessThanOrEqual(120)
  })
})
