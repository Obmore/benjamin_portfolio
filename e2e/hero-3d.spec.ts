import { expect, test, type Page } from '@playwright/test'

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
  seek?: (p: number) => void
  dispose?: () => void
  qaShiftEnd?: (index: number, dx: number, dy: number) => void
  ends: HeroEnd[]
  progress: number
  layers: number
  tier: string
  info: { calls: number; memory: { geometries: number; textures: number } }
}

async function waitHero3d(page: Page) {
  await page.waitForFunction(
    () => {
      const box = document.querySelector('.hero-3d')
      const hook = (window as Window & { __hero3d?: Hero3dHook }).__hero3d
      return Boolean(box?.classList.contains('is-swapped') && hook?.seek && hook.dispose)
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
      expect(at100?.layers).toBe(3)
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
    const probe = await page.evaluate(() => {
      const hook = (window as Window & { __hero3d?: Hero3dHook }).__hero3d
      if (!hook?.qaShiftEnd) return null
      hook.seek?.(1)
      const before = hook.ends[0]
      hook.qaShiftEnd(0, 2, 0)
      const after = hook.ends[0]
      const rest = hook.ends.slice(1)
      return { before, after, restOk: rest.every((e) => Math.abs(e.x - e.ax) <= 1 && Math.abs(e.y - e.ay) <= 1) }
    })
    expect(probe?.before).toBeTruthy()
    expect(Math.abs((probe?.before.x ?? 0) - (probe?.before.ax ?? 0))).toBeLessThanOrEqual(1)
    expect(Math.abs((probe?.after.x ?? 0) - (probe?.after.ax ?? 0))).toBeGreaterThan(1)
    expect(probe?.after.x).toBe((probe?.before.x ?? 0) + 2)
    expect(probe?.restOk).toBe(true)
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
        swapping: box?.classList.contains('is-swapping-back') ?? false,
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
    expect(probe?.canvas === false || probe?.canvasVis === 'hidden').toBeTruthy()
    expect(probe?.flag).toBe('1')
    await page.waitForFunction(() => !document.querySelector('.hero-3d canvas'), null, { timeout: 2000 })
    await expect(page.locator('.hero-3d-poster')).toBeVisible()
  })

  test('20x CPU watchdog falls back to the poster within 10s', async ({ page }) => {
    test.setTimeout(30000)
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
      { timeout: 10000 },
    )
    const poster = page.locator('.hero-3d-poster')
    await expect(poster).toBeVisible()
    await expect(poster).toHaveAttribute('data-pose', '100')
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
      for (let i = 0; i < 3; i += 1) {
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
        if (!reduced) {
          await p.waitForFunction(
            () => document.querySelector('.hero-3d')?.classList.contains('is-ready'),
            null,
            { timeout: 30000 },
          )
        }
        await p.waitForTimeout(800)
        const lcp = await p.evaluate(() => (window as Window & { __lcp: number | null }).__lcp)
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
})
