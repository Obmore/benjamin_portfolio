import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type ConsoleMessage, type Locator, type Page } from '@playwright/test'

const ORDER_PATH = '/megrendeles/'
const ORDER_HREF = '/megrendeles/'
const ARTIFACTS = '/opt/cursor/artifacts'
const VIEWPORTS = [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
] as const

function collectConsoleErrors(page: Page): ConsoleMessage[] {
  const errors: ConsoleMessage[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg)
  })
  page.on('pageerror', (error) => {
    throw error
  })
  return errors
}

async function gotoHome(page: Page): Promise<void> {
  const response = await page.goto('/', { waitUntil: 'networkidle' })
  expect(response, 'homepage response').toBeTruthy()
  expect(response!.status(), 'homepage status').toBe(200)
  expect(response!.request().redirectedFrom(), 'homepage must not 301').toBeNull()
  await page.evaluate(() => document.fonts.ready)
}

function orderLinks(page: Page): Locator {
  return page.locator(`a[href="${ORDER_HREF}"]`)
}

async function assertNoHorizontalScroll(page: Page, label: string): Promise<void> {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement
    return {
      scrollWidth: root.scrollWidth,
      clientWidth: root.clientWidth,
    }
  })
  expect(
    overflow.scrollWidth,
    `horizontal scroll ${label}: ${overflow.scrollWidth} > ${overflow.clientWidth}`,
  ).toBeLessThanOrEqual(overflow.clientWidth + 1)
}

async function assertOrderLink(link: Locator, label: string, expectedText = 'Megrendelés'): Promise<void> {
  await expect(link, label).toHaveCount(1)
  await expect(link).toHaveAttribute('href', ORDER_HREF)
  await expect(link).toHaveText(expectedText)
  await expect(link).not.toHaveAttribute('target', '_blank')
  await expect(link).not.toHaveAttribute('lang')
  await expect(link).not.toContainText(/ajánlat/i)
}

async function assertNoLangOnOrderLinks(page: Page): Promise<void> {
  const links = orderLinks(page)
  const count = await links.count()
  for (let i = 0; i < count; i += 1) {
    await expect(links.nth(i), `order link ${i} lang`).not.toHaveAttribute('lang')
  }
}

async function assertHeroActionOrder(
  page: Page,
  labels: { work: string; cv: string; order: string },
  cvFile: string,
): Promise<void> {
  const actions = page.locator('.hero-actions a, .hero-actions button')
  await expect(actions).toHaveCount(3)
  await expect(page.locator('.hero-actions').locator(`a[href="${ORDER_HREF}"]`)).toHaveCount(1)

  const work = actions.nth(0)
  const cv = actions.nth(1)
  const order = actions.nth(2)

  await expect(work).toHaveText(labels.work)
  await expect(work).toHaveAttribute('href', '/#munkaim')
  await expect(cv).toContainText(labels.cv)
  await expect(cv).toHaveAttribute('href', new RegExp(`${cvFile}$`))
  await expect(cv).toHaveAttribute('download', cvFile)
  await assertOrderLink(order, 'hero', labels.order)

  for (const name of ['work', 'cv', 'order'] as const) {
    const box = await { work, cv, order }[name].boundingBox()
    expect(box, `${name} tap target`).toBeTruthy()
    expect(box!.height, `${name} min 44px`).toBeGreaterThanOrEqual(44)
  }
}

async function clickOrderAndExpectPage(page: Page, link: Locator): Promise<void> {
  const responsePromise = page.waitForResponse((response) => {
    try {
      const url = new URL(response.url())
      return (
        response.request().resourceType() === 'document' &&
        url.pathname.replace(/\/?$/, '/') === ORDER_PATH
      )
    } catch {
      return false
    }
  })
  await link.click()
  const response = await responsePromise
  await page.waitForURL(/\/megrendeles\/$/)
  expect(response.status(), `${ORDER_PATH} status after click`).toBe(200)
  expect(response.request().redirectedFrom(), `${ORDER_PATH} must not 301`).toBeNull()
  expect(new URL(page.url()).pathname).toBe(ORDER_PATH)
  await expect(page.locator('h1')).toContainText('Megrendelés')
}

test.describe('homepage /megrendeles/ entry points', () => {
  test('counts exactly five /megrendeles/ links', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoHome(page)

    await expect(page.locator('html')).toHaveAttribute('lang', 'hu')
    await expect(orderLinks(page)).toHaveCount(5)
    await assertNoLangOnOrderLinks(page)

    const headerNav = page.getByRole('navigation', { name: 'Fő navigáció' }).locator(`a[href="${ORDER_HREF}"]`)
    const mobileNav = page.locator('nav[aria-label="Mobil navigáció"]').locator(`a[href="${ORDER_HREF}"]`)
    const hero = page.locator('.hero-actions').locator(`a[href="${ORDER_HREF}"]`)
    const contact = page.locator('#kapcsolat').locator(`a[href="${ORDER_HREF}"]`)
    const footer = page.locator('footer').locator(`a[href="${ORDER_HREF}"]`)

    await assertOrderLink(headerNav, 'desktop nav')
    await assertOrderLink(mobileNav, 'mobile nav')
    await assertOrderLink(hero, 'hero')
    await assertOrderLink(contact, 'contact')
    await assertOrderLink(footer, 'footer')

    const navItems = page.getByRole('navigation', { name: 'Fő navigáció' }).locator('button, a')
    await expect(navItems.last()).toHaveText('Megrendelés')
    await expect(navItems.nth(-2)).toHaveText('Kapcsolat')

    await assertHeroActionOrder(
      page,
      { work: 'Munkáim', cv: 'Önéletrajz letöltése', order: 'Megrendelés' },
      'Ott_Benjamin_CV_HU.pdf',
    )
    await expect(page.locator('body')).not.toContainText(/ajánlat/i)
    await expect(page.locator('body')).not.toContainText(/\d[\d\s\u00a0.]*Ft/)
    await expect(page.locator('body')).not.toContainText('Bemutatkozó oldal vállalkozásoknak')
    await expect(page.locator('body')).not.toContainText('Egyedi webes megoldás')

    const heading = page.locator('#hero h1')
    const sub = page.locator('.hero-sub')
    const headingBox = await heading.boundingBox()
    const subBox = await sub.boundingBox()
    const heroBox = await hero.boundingBox()
    expect(headingBox).toBeTruthy()
    expect(subBox).toBeTruthy()
    expect(heroBox).toBeTruthy()
    expect(heroBox!.y, 'order link below the role line').toBeGreaterThan(headingBox!.y + headingBox!.height)
    expect(heroBox!.y, 'order link below the subhead').toBeGreaterThan(subBox!.y + subBox!.height - 1)

    expect(consoleErrors.map((msg) => msg.text()), 'console errors').toEqual([])
  })

  test('desktop nav, hero, contact and footer open /megrendeles/ with 200', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoHome(page)
    await clickOrderAndExpectPage(
      page,
      page.getByRole('navigation', { name: 'Fő navigáció' }).locator(`a[href="${ORDER_HREF}"]`),
    )

    await gotoHome(page)
    await clickOrderAndExpectPage(page, page.locator('.hero-actions').locator(`a[href="${ORDER_HREF}"]`))

    await gotoHome(page)
    await clickOrderAndExpectPage(page, page.locator('#kapcsolat').locator(`a[href="${ORDER_HREF}"]`))

    await gotoHome(page)
    await clickOrderAndExpectPage(page, page.locator('footer').locator(`a[href="${ORDER_HREF}"]`))

    expect(consoleErrors.map((msg) => msg.text()), 'console errors').toEqual([])
  })

  test('mobile menu last row is Order with 44px tap target', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await gotoHome(page)
    await expect(orderLinks(page)).toHaveCount(5)

    await page.getByRole('button', { name: 'Menü megnyitása' }).click()
    const mobileNav = page.getByRole('navigation', { name: 'Mobil navigáció' })
    const mobileLink = mobileNav.locator(`a[href="${ORDER_HREF}"]`)
    await expect(mobileLink).toBeVisible()
    await assertOrderLink(mobileLink, 'mobile nav order link')
    await expect(mobileNav.locator('button, a').last()).toHaveText('Megrendelés')

    const box = await mobileLink.boundingBox()
    expect(box).toBeTruthy()
    expect(box!.height, 'mobile tap target').toBeGreaterThanOrEqual(44)
    await assertNoHorizontalScroll(page, '390 open menu')

    await clickOrderAndExpectPage(page, mobileLink)
    expect(consoleErrors.map((msg) => msg.text()), 'console errors').toEqual([])
  })

  test('English labels are Order and html lang is en', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoHome(page)
    await page.getByRole('button', { name: /váltás angolra/i }).click()

    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(orderLinks(page)).toHaveCount(5)
    await assertNoLangOnOrderLinks(page)

    const headerNav = page.getByRole('navigation', { name: 'Main navigation' }).locator(`a[href="${ORDER_HREF}"]`)
    const mobileNav = page.locator('nav[aria-label="Mobile navigation"]').locator(`a[href="${ORDER_HREF}"]`)
    const hero = page.locator('.hero-actions').locator(`a[href="${ORDER_HREF}"]`)
    const contact = page.locator('#kapcsolat').locator(`a[href="${ORDER_HREF}"]`)
    const footer = page.locator('footer').locator(`a[href="${ORDER_HREF}"]`)

    await assertOrderLink(headerNav, 'desktop nav EN', 'Order')
    await assertOrderLink(mobileNav, 'mobile nav EN', 'Order')
    await assertOrderLink(hero, 'hero EN', 'Order')
    await assertOrderLink(contact, 'contact EN', 'Order')
    await assertOrderLink(footer, 'footer EN', 'Order')

    await assertHeroActionOrder(
      page,
      { work: 'My work', cv: 'Download resume', order: 'Order' },
      'Ott_Benjamin_CV_EN.pdf',
    )
  })

  test('desktop nav stays on one line at 1025–1280 and 1440', async ({ page }) => {
    for (const width of [1025, 1100, 1280, 1440]) {
      await page.setViewportSize({ width, height: 800 })
      await gotoHome(page)
      const headerBox = await page.locator('header.site-header').boundingBox()
      expect(headerBox?.height ?? 0, `header height ${width}`).toBe(64)
      const nav = page.getByRole('navigation', { name: 'Fő navigáció' })
      await expect(nav).toBeVisible()
      const count = await nav.locator('button, a').count()
      const ys: number[] = []
      for (let i = 0; i < count; i += 1) {
        const box = await nav.locator('button, a').nth(i).boundingBox()
        expect(box, `nav item ${i} at ${width}`).toBeTruthy()
        ys.push(box!.y)
      }
      expect(Math.max(...ys) - Math.min(...ys), `nav wrap at ${width}`).toBeLessThan(2)
      await assertNoHorizontalScroll(page, String(width))
    }
  })

  for (const viewport of VIEWPORTS) {
    test(`no horizontal scroll at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      const consoleErrors = collectConsoleErrors(page)
      await page.setViewportSize(viewport)
      await gotoHome(page)
      await expect(orderLinks(page)).toHaveCount(5)
      await assertNoHorizontalScroll(page, `${viewport.width}`)
      expect(consoleErrors.map((msg) => msg.text()), 'console errors').toEqual([])
    })
  }

  test('CLS is 0 at 360, 390 and 1440', async ({ browser }) => {
    const results: Record<string, number> = {}

    for (const viewport of VIEWPORTS) {
      const page = await browser.newPage()
      await page.addInitScript(() => {
        Object.defineProperty(window, '__cls', {
          value: 0,
          writable: true,
          configurable: true,
        })
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const shift = entry as { hadRecentInput?: boolean; value: number }
            if (!shift.hadRecentInput) {
              ;(window as unknown as { __cls: number }).__cls += shift.value
            }
          }
        })
        observer.observe({ type: 'layout-shift', buffered: true })
      })
      await page.setViewportSize(viewport)
      await page.goto('/', { waitUntil: 'networkidle' })
      await page.evaluate(() => document.fonts.ready)
      await page.waitForTimeout(1500)
      const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls)
      results[String(viewport.width)] = cls
      await page.close()
    }

    const outDir = path.join(process.cwd(), 'test-results')
    fs.mkdirSync(outDir, { recursive: true })
    const payload = `${JSON.stringify(results, null, 2)}\n`
    fs.writeFileSync(path.join(outDir, 'order-entry-cls.json'), payload)
    fs.mkdirSync(ARTIFACTS, { recursive: true })
    fs.writeFileSync(path.join(ARTIFACTS, 'order-entry-cls.json'), payload)

    expect(results['360'], `CLS 360=${results['360']}`).toBe(0)
    expect(results['390'], `CLS 390=${results['390']}`).toBe(0)
    expect(results['1440'], `CLS 1440=${results['1440']}`).toBe(0)
  })

  test('screenshots hero, EN hero and open mobile menu', async ({ page }) => {
    fs.mkdirSync(ARTIFACTS, { recursive: true })
    await page.emulateMedia({ reducedMotion: 'reduce' })

    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoHome(page)
    await page.screenshot({
      path: path.join(ARTIFACTS, 'go_hero_1440.png'),
      animations: 'disabled',
    })

    await page.getByRole('button', { name: /váltás angolra/i }).click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.locator('.hero-actions').locator(`a[href="${ORDER_HREF}"]`)).toHaveText('Order')
    await page.screenshot({
      path: path.join(ARTIFACTS, 'go_hero_en_1440.png'),
      animations: 'disabled',
    })

    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('button', { name: /switch to Hungarian/i }).click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'hu')
    await gotoHome(page)
    await page.screenshot({
      path: path.join(ARTIFACTS, 'go_hero_390.png'),
      animations: 'disabled',
    })

    await page.setViewportSize({ width: 360, height: 800 })
    await gotoHome(page)
    await page.screenshot({
      path: path.join(ARTIFACTS, 'go_hero_360.png'),
      animations: 'disabled',
    })

    await page.setViewportSize({ width: 390, height: 844 })
    await gotoHome(page)
    await page.getByRole('button', { name: 'Menü megnyitása' }).click()
    await expect(
      page.getByRole('navigation', { name: 'Mobil navigáció' }).locator(`a[href="${ORDER_HREF}"]`),
    ).toBeVisible()
    await page.screenshot({
      path: path.join(ARTIFACTS, 'go_menu_390.png'),
      animations: 'disabled',
    })
  })
})
