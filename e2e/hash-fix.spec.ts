import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

const ARTIFACTS = '/opt/cursor/artifacts'
const VIEWPORTS = [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
] as const

const NAV_FIVE = [
  { name: 'Munkáim', id: 'munkaim' },
  { name: 'Rólam', id: 'rolam' },
  { name: 'Tapasztalat', id: 'tapasztalat' },
  { name: 'Kompetenciák', id: 'kompetenciak' },
  { name: 'Önéletrajz', id: 'oneletrajz' },
] as const

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

async function gotoHome(page: Page, path = '/') {
  const response = await page.goto(path, { waitUntil: 'networkidle' })
  if (response) expect(response.status()).toBe(200)
  await page.evaluate(() => document.fonts.ready)
}

async function sectionDelta(page: Page, id: string) {
  return page.evaluate((sectionId) => {
    const el = document.getElementById(sectionId)
    if (!el) return 9999
    const offset = Number.parseFloat(getComputedStyle(el).scrollMarginTop) || 0
    return el.getBoundingClientRect().top - offset
  }, id)
}

async function waitAligned(page: Page, id: string, timeout = 8_000) {
  await page.waitForFunction(
    (sectionId) => {
      const el = document.getElementById(sectionId)
      if (!el) return false
      const offset = Number.parseFloat(getComputedStyle(el).scrollMarginTop) || 0
      return Math.abs(el.getBoundingClientRect().top - offset) <= 2
    },
    id,
    { timeout },
  )
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

async function assertNoHorizontalScroll(page: Page, label: string) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement
    return { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth }
  })
  expect(
    overflow.scrollWidth,
    `horizontal scroll ${label}`,
  ).toBeLessThanOrEqual(overflow.clientWidth + 1)
}

async function assertNoJunkHrefs(page: Page) {
  const hrefs = await page.evaluate(() =>
    [...document.querySelectorAll('a[href]')].map((el) => el.getAttribute('href') ?? ''),
  )
  expect(hrefs.filter((href) => href === '#' || href === '#root' || href === '#top')).toEqual([])
}

test.describe('hash-fix PR7', () => {
  test('SeoHead hydrate keeps html.js, dark theme, and below-fold reveal', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await page.addInitScript(() => {
      localStorage.setItem('theme', 'dark')
    })
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoHome(page)

    await expect(page.locator('html')).toHaveClass(/\bjs\b/)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.locator('html')).toHaveAttribute('lang', 'hu')

    const heroOpacity = await page.evaluate(() => {
      const name = document.querySelector('.hero-name')
      return name ? getComputedStyle(name).opacity : 'missing'
    })
    expect(Number(heroOpacity), `hero opacity ${heroOpacity}`).toBeGreaterThan(0)

    const hidden = page.locator('#oneletrajz [data-reveal]').first()
    await expect(hidden).toHaveCount(1)
    const hiddenOpacity = await hidden.evaluate((el) => getComputedStyle(el).opacity)
    expect(Number(hiddenOpacity), `below-fold opacity ${hiddenOpacity}`).toBe(0)
    expect(await hidden.getAttribute('data-revealed')).toBeNull()

    await hidden.scrollIntoViewIfNeeded()
    await expect(hidden).toHaveAttribute('data-revealed', 'true')
    await expect
      .poll(async () => hidden.evaluate((el) => getComputedStyle(el).opacity))
      .toBe('1')

    await page.reload({ waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    await expect(page.locator('html')).toHaveClass(/\bjs\b/)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    expect(errors, errors.join('\n')).toEqual([])
  })

  test('saved EN locale reloads with lang=en', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('portfolio-locale', 'en')
    })
    await gotoHome(page)
    await page.waitForFunction(() => document.documentElement.lang === 'en')
    await expect(
      page.getByRole('link', { name: 'OB. – Ott Benjámin, back to top' }),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'OB. – Ott Benjámin, back to top' }),
    ).toHaveText('OB.')
    await expect(page.getByRole('link', { name: 'Skip to content' })).toHaveCount(1)
  })

  test('skip link is first Tab, focuses main, leaves no hash', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoHome(page)

    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Ugrás a tartalomra' })
    await expect(skip).toBeFocused()
    const skipBox = await skip.boundingBox()
    expect(skipBox?.height ?? 0).toBeGreaterThanOrEqual(44)

    await page.keyboard.press('Enter')
    await expect(page.locator('main')).toBeFocused()
    expect(await page.evaluate(() => location.hash)).toBe('')
    expect(page.url()).not.toContain('#')
    expect(errors, errors.join('\n')).toEqual([])
  })

  test('name link, junk hashes, work index replaceState, language switch', async ({
    page,
  }) => {
    const errors = collectConsoleErrors(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('about:blank')
    await gotoHome(page)

    const logo = page.getByRole('link', { name: 'OB. – Ott Benjámin, ugrás az oldal tetejére' })
    await expect(logo).toHaveAttribute('href', '/')
    await expect(logo).toHaveText('OB.')
    await expect(logo.locator('.text-accent')).toHaveText('.')
    const logoBox = await logo.boundingBox()
    expect(logoBox?.height ?? 0).toBeGreaterThanOrEqual(44)
    expect(logoBox?.width ?? 0).toBeGreaterThanOrEqual(44)
    const headerBox = await page.locator('header.site-header').boundingBox()
    expect(headerBox?.height ?? 0).toBe(64)
    await expect(page.locator('header [aria-current="true"]')).toHaveCount(0)
    await assertNoJunkHrefs(page)

    const startLength = await page.evaluate(() => history.length)

    for (const item of NAV_FIVE) {
      await clickDesktopNav(page, item.name)
      await waitAligned(page, item.id)
    }
    expect(await page.evaluate(() => history.length)).toBe(startLength)

    await clickDesktopNav(page, 'Kapcsolat')
    await waitAligned(page, 'kapcsolat')
    await logo.click()
    await page.waitForFunction(() => Math.abs(window.scrollY) < 2)
    expect(page.url()).not.toContain('#')
    expect(await page.evaluate(() => history.length)).toBe(startLength)
    await expect(page.locator('header [aria-current="true"]')).toHaveCount(0)

    await page.goBack()
    expect(page.url()).toBe('about:blank')

    await gotoHome(page, '/#root')
    await page.waitForFunction(() => location.hash === '')
    expect(page.url()).not.toContain('#root')
    await page.getByRole('button', { name: /^EN/ }).click()
    await page.waitForFunction(() => document.documentElement.lang === 'en')
    expect(await page.evaluate(() => location.hash)).toBe('')
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForFunction(() => location.hash === '')
    expect(page.url()).not.toContain('#root')
    await page.getByRole('button', { name: /^HU/ }).click()
    await page.waitForFunction(() => document.documentElement.lang === 'hu')

    await gotoHome(page, '/#')
    await page.waitForFunction(() => !location.href.includes('#'))
    expect(page.url()).not.toContain('#')

    await gotoHome(page)
    const afterHome = await page.evaluate(() => history.length)
    await page.locator('.work-index-link').first().click()
    await page.waitForFunction(() => location.hash.startsWith('#munka-'))
    expect(await page.evaluate(() => history.length)).toBe(afterHome)
    await clickDesktopNav(page, 'Önéletrajz')
    await waitAligned(page, 'oneletrajz')
    expect(await page.evaluate(() => location.hash)).toBe('#oneletrajz')

    await clickDesktopNav(page, 'Tapasztalat')
    await waitAligned(page, 'tapasztalat')
    const beforeLang = await sectionDelta(page, 'tapasztalat')
    expect(Math.abs(beforeLang)).toBeLessThanOrEqual(2)
    await page.getByRole('button', { name: /^EN/ }).click()
    await page.waitForFunction(() => document.documentElement.lang === 'en')
    await page.waitForTimeout(400)
    expect(Math.abs(await sectionDelta(page, 'tapasztalat'))).toBeLessThanOrEqual(2)
    expect(await page.evaluate(() => location.hash)).toBe('#tapasztalat')
    await page.getByRole('button', { name: /^HU/ }).click()
    await page.waitForFunction(() => document.documentElement.lang === 'hu')
    await page.waitForTimeout(400)
    expect(Math.abs(await sectionDelta(page, 'tapasztalat'))).toBeLessThanOrEqual(2)

    await gotoHome(page, '/#kapcsolat')
    await waitAligned(page, 'kapcsolat')
    await page.reload({ waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(700)
    expect(Math.abs(await sectionDelta(page, 'kapcsolat'))).toBeLessThanOrEqual(2)
    expect(await page.evaluate(() => location.hash)).toBe('#kapcsolat')

    expect(errors, errors.join('\n')).toEqual([])
  })

  for (const viewport of VIEWPORTS) {
    test(`${viewport.width}: console clean, no horizontal scroll, screenshots`, async ({
      page,
    }) => {
      const errors = collectConsoleErrors(page)
      await page.setViewportSize(viewport)
      await gotoHome(page)
      await assertNoHorizontalScroll(page, String(viewport.width))
      await expect(page.locator('html')).toHaveClass(/\bjs\b/)
      await expect(page.locator('html')).toHaveAttribute('lang', 'hu')

      const logo = page.getByRole('link', { name: 'OB. – Ott Benjámin, ugrás az oldal tetejére' })
      await expect(logo).toHaveText('OB.')
      const box = await logo.boundingBox()
      expect(box?.height ?? 0, `logo height ${viewport.width}`).toBeGreaterThanOrEqual(44)
      expect(box?.width ?? 0, `logo width ${viewport.width}`).toBeGreaterThanOrEqual(44)
      const headerBox = await page.locator('header.site-header').boundingBox()
      expect(headerBox?.height ?? 0, `header height ${viewport.width}`).toBe(64)

      if (viewport.width < 1024) {
        await clickMobileNav(page, 'Kapcsolat')
        await waitAligned(page, 'kapcsolat')
        await page.getByRole('button', { name: 'Menü megnyitása' }).click()
        await expect(page.getByRole('navigation', { name: 'Mobil navigáció' })).toBeVisible()
        await logo.click()
        await page.waitForFunction(() => Math.abs(window.scrollY) < 2)
        expect(page.url()).not.toContain('#')
        await expect(page.getByRole('navigation', { name: 'Mobil navigáció' })).toBeHidden()
      }

      fs.mkdirSync(ARTIFACTS, { recursive: true })
      await page.screenshot({
        path: `${ARTIFACTS}/hash-fix-${viewport.width}.png`,
        fullPage: false,
      })

      expect(errors, errors.join('\n')).toEqual([])
    })
  }

  test('desktop nav stays on one row at 1025–1280 with OB. logo', async ({ page }) => {
    for (const width of [1025, 1100, 1280] as const) {
      await page.setViewportSize({ width, height: 800 })
      await gotoHome(page)
      const headerBox = await page.locator('header.site-header').boundingBox()
      expect(headerBox?.height ?? 0, `header height ${width}`).toBe(64)
      const logo = page.getByRole('link', { name: 'OB. – Ott Benjámin, ugrás az oldal tetejére' })
      await expect(logo).toHaveText('OB.')
      const logoBox = await logo.boundingBox()
      expect(logoBox?.height ?? 0, `logo height ${width}`).toBeGreaterThanOrEqual(44)
      expect(logoBox?.width ?? 0, `logo width ${width}`).toBeGreaterThanOrEqual(44)

      const nav = page.getByRole('navigation', { name: 'Fő navigáció' })
      await expect(nav).toBeVisible()
      const buttons = nav.getByRole('button')
      await expect(buttons).toHaveCount(6)
      const tops = await buttons.evaluateAll((els) =>
        els.map((el) => Math.round(el.getBoundingClientRect().top)),
      )
      expect(new Set(tops).size, `nav wrap at ${width}: ${tops.join(',')}`).toBe(1)
      await assertNoHorizontalScroll(page, String(width))
    }
  })

  test('390 language switch at #tapasztalat stays ±2px', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await gotoHome(page)
    await clickMobileNav(page, 'Tapasztalat')
    await waitAligned(page, 'tapasztalat')
    await page.getByRole('button', { name: /^EN/ }).click()
    await page.waitForFunction(() => document.documentElement.lang === 'en')
    await page.waitForTimeout(400)
    expect(Math.abs(await sectionDelta(page, 'tapasztalat'))).toBeLessThanOrEqual(2)
    expect(await page.evaluate(() => location.hash)).toBe('#tapasztalat')
    await page.getByRole('button', { name: /^HU/ }).click()
    await page.waitForFunction(() => document.documentElement.lang === 'hu')
    await page.waitForTimeout(400)
    expect(Math.abs(await sectionDelta(page, 'tapasztalat'))).toBeLessThanOrEqual(2)
    expect(errors, errors.join('\n')).toEqual([])
  })

  test('360 language switch at #tapasztalat stays ±2px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 })
    await gotoHome(page)
    await clickMobileNav(page, 'Tapasztalat')
    await waitAligned(page, 'tapasztalat')
    await page.getByRole('button', { name: /^EN/ }).click()
    await page.waitForFunction(() => document.documentElement.lang === 'en')
    await page.waitForTimeout(400)
    expect(Math.abs(await sectionDelta(page, 'tapasztalat'))).toBeLessThanOrEqual(2)
  })
})
