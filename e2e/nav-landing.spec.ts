import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'

const NAV_ITEMS = [
  { name: 'Munkáim', id: 'munkaim' },
  { name: 'Rólam', id: 'rolam' },
  { name: 'Tapasztalat', id: 'tapasztalat' },
  { name: 'Kompetenciák', id: 'kompetenciak' },
  { name: 'Önéletrajz', id: 'oneletrajz' },
  { name: 'Kapcsolat', id: 'kapcsolat' },
] as const

const ARTIFACTS = path.join(process.cwd(), 'test-results')

type Landing = { atEnd: number; at700: number }

async function gotoHome(page: Page) {
  const response = await page.goto('/', { waitUntil: 'networkidle' })
  expect(response?.status()).toBe(200)
  await page.evaluate(() => document.fonts.ready)
}

async function scrollToTop(page: Page) {
  await page.evaluate(() => {
    const root = document.documentElement
    root.style.scrollBehavior = 'auto'
    window.scrollTo(0, 0)
    root.style.scrollBehavior = ''
  })
  await page.waitForFunction(() => Math.abs(window.scrollY) < 1)
}

async function armLandingMeasure(page: Page, id: string) {
  await page.evaluate((sectionId) => {
    const measure = () => {
      const el = document.getElementById(sectionId)
      if (!el) return 9999
      const offset = Number.parseFloat(getComputedStyle(el).scrollMarginTop) || 0
      return el.getBoundingClientRect().top - offset
    }
    const state = { atEnd: null as number | null, at700: null as number | null, done: false }
    ;(window as unknown as { __navLanding: typeof state }).__navLanding = state
    const onEnd = () => {
      if (state.atEnd !== null) return
      state.atEnd = measure()
      window.setTimeout(() => {
        state.at700 = measure()
        state.done = true
      }, 700)
    }
    window.addEventListener('scrollend', onEnd, { once: true })
  }, id)
}

async function readLanding(page: Page): Promise<Landing> {
  await page.waitForFunction(
    () => (window as unknown as { __navLanding?: { done: boolean } }).__navLanding?.done === true,
    null,
    { timeout: 20_000 },
  )
  return page.evaluate(() => {
    const state = (window as unknown as { __navLanding: Landing }).__navLanding
    return { atEnd: state.atEnd, at700: state.at700 }
  })
}

async function clickDesktopNav(page: Page, name: string) {
  await page
    .getByRole('navigation', { name: 'Fő navigáció' })
    .getByRole('button', { name, exact: true })
    .click()
}

async function clickMobileNav(page: Page, name: string) {
  await page.getByRole('button', { name: 'Menü megnyitása' }).click()
  const mobile = page.getByRole('navigation', { name: 'Mobil navigáció' })
  await expect(mobile).toBeVisible()
  await mobile.getByRole('button', { name, exact: true }).click()
}

async function namedSiteHeaders(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('*')]
      .filter((el) => getComputedStyle(el).viewTransitionName === 'site-header')
      .map((el) => ({
        tag: el.tagName,
        className: (el as HTMLElement).className,
      })),
  )
}

test.describe('warm nav landing from the top', () => {
  test('1440 desktop: ±2px at scrollend and +700ms', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoHome(page)
    const results: Record<string, Landing> = {}

    for (const item of NAV_ITEMS) {
      await scrollToTop(page)
      await armLandingMeasure(page, item.id)
      await clickDesktopNav(page, item.name)
      const landing = await readLanding(page)
      results[item.id] = landing
      expect(
        Math.abs(landing.atEnd),
        `${item.id} scrollend delta ${landing.atEnd}`,
      ).toBeLessThanOrEqual(2)
      expect(
        Math.abs(landing.at700),
        `${item.id} +700ms delta ${landing.at700}`,
      ).toBeLessThanOrEqual(2)
    }

    fs.mkdirSync(ARTIFACTS, { recursive: true })
    fs.writeFileSync(
      path.join(ARTIFACTS, 'nav-landing-1440.json'),
      `${JSON.stringify(results, null, 2)}\n`,
    )
  })

  test('390 mobile menu: ±2px at scrollend and +700ms', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await gotoHome(page)
    const results: Record<string, Landing> = {}

    for (const item of NAV_ITEMS) {
      await scrollToTop(page)
      await armLandingMeasure(page, item.id)
      await clickMobileNav(page, item.name)
      const landing = await readLanding(page)
      results[item.id] = landing
      expect(
        Math.abs(landing.atEnd),
        `${item.id} scrollend delta ${landing.atEnd}`,
      ).toBeLessThanOrEqual(2)
      expect(
        Math.abs(landing.at700),
        `${item.id} +700ms delta ${landing.at700}`,
      ).toBeLessThanOrEqual(2)
    }

    fs.mkdirSync(ARTIFACTS, { recursive: true })
    fs.writeFileSync(
      path.join(ARTIFACTS, 'nav-landing-390.json'),
      `${JSON.stringify(results, null, 2)}\n`,
    )
  })

  test('reduced-motion 1440: ±2px at scrollend and +700ms', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoHome(page)

    for (const item of NAV_ITEMS) {
      await scrollToTop(page)
      await armLandingMeasure(page, item.id)
      await clickDesktopNav(page, item.name)
      const landing = await readLanding(page)
      expect(Math.abs(landing.atEnd), `${item.id} scrollend ${landing.atEnd}`).toBeLessThanOrEqual(2)
      expect(Math.abs(landing.at700), `${item.id} +700ms ${landing.at700}`).toBeLessThanOrEqual(2)
    }
  })
})

test.describe('language view transition', () => {
  test('exactly one site-header name with the 390 menu open', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await gotoHome(page)
    await page.getByRole('button', { name: 'Menü megnyitása' }).click()
    await expect(page.getByRole('navigation', { name: 'Mobil navigáció' })).toBeVisible()
    await page.evaluate(() => document.documentElement.classList.add('is-lang-vt'))
    const named = await namedSiteHeaders(page)
    expect(named, JSON.stringify(named)).toHaveLength(1)
    expect(named[0]?.tag).toBe('HEADER')
    expect(named[0]?.className).toContain('site-header')
    expect(named[0]?.className).toContain('fixed')
  })

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ]) {
    test(`HU↔EN at ${viewport.width}: console clean and CLS 0`, async ({ page }) => {
      const errors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text())
      })
      page.on('pageerror', (error) => {
        errors.push(error.message)
      })

      await page.addInitScript(() => {
        Object.defineProperty(window, '__cls', {
          value: 0,
          writable: true,
          configurable: true,
        })
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const shift = entry as PerformanceEntry & { hadRecentInput?: boolean; value: number }
            if (!shift.hadRecentInput) {
              ;(window as unknown as { __cls: number }).__cls += shift.value
            }
          }
        })
        observer.observe({ type: 'layout-shift', buffered: true })
      })

      await page.setViewportSize(viewport)
      await gotoHome(page)

      await page.getByRole('button', { name: /^EN/ }).click()
      await page.waitForFunction(() => document.documentElement.lang === 'en')
      await page.waitForTimeout(500)
      await page.getByRole('button', { name: /^HU/ }).click()
      await page.waitForFunction(() => document.documentElement.lang === 'hu')
      await page.waitForTimeout(500)

      const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls)
      expect(cls, `CLS ${viewport.width}=${cls}`).toBe(0)
      expect(
        errors.filter((text) => /view-transition|duplicate|Snapshot capture/i.test(text)),
        errors.join('\n'),
      ).toEqual([])
      expect(errors, errors.join('\n')).toEqual([])
    })
  }
})
