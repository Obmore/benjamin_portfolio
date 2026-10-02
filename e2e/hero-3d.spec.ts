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
      if (/\b(three|gsap)/i.test(url) && url.endsWith('.js')) requests.push(url)
    })
    await gotoHome(page, '?qa3d=1')
    await page.waitForTimeout(2500)
    await expect(page.locator('.hero-3d canvas')).toHaveCount(0)
    await expect(page.locator('.hero-3d-poster')).toBeVisible()
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
})
