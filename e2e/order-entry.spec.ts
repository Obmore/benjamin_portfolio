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

async function assertOrderLink(link: Locator, label: string): Promise<void> {
  await expect(link, label).toHaveCount(1)
  await expect(link).toHaveAttribute('href', ORDER_HREF)
  await expect(link).toHaveAttribute('hreflang', 'hu')
  await expect(link).toHaveText('Megrendelés')
  await expect(link).not.toHaveAttribute('target', '_blank')
  await expect(link).not.toContainText(/ajánlat/i)
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
  await page.waitForURL(/\/megrendeles\/?$/)
  expect(response.status(), `${ORDER_PATH} status after click`).toBe(200)
  await expect(page.locator('h1')).toContainText('Megrendelés')
}

test.describe('homepage /megrendeles/ entry points', () => {
  test('desktop nav, hero and footer links open the order page', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoHome(page)

    const headerNav = page.getByRole('navigation', { name: 'Fő navigáció' }).locator(`a[href="${ORDER_HREF}"]`)
    const hero = page.locator('.hero-actions').locator(`a[href="${ORDER_HREF}"]`)
    const footer = page.locator('footer').locator(`a[href="${ORDER_HREF}"]`)

    await assertOrderLink(headerNav, 'desktop nav order link')
    await assertOrderLink(hero, 'hero order link')
    await assertOrderLink(footer, 'footer order link')
    await expect(orderLinks(page)).toHaveCount(4)

    const heading = page.locator('#hero h1')
    const headingBox = await heading.boundingBox()
    const heroBox = await hero.boundingBox()
    expect(headingBox).toBeTruthy()
    expect(heroBox).toBeTruthy()
    expect(heroBox!.y, 'hero CTA must sit below the heading').toBeGreaterThan(
      headingBox!.y + headingBox!.height,
    )

    await clickOrderAndExpectPage(page, headerNav)

    await gotoHome(page)
    await clickOrderAndExpectPage(
      page,
      page.locator('.hero-actions').locator(`a[href="${ORDER_HREF}"]`),
    )

    await gotoHome(page)
    await clickOrderAndExpectPage(
      page,
      page.locator('footer').locator(`a[href="${ORDER_HREF}"]`),
    )

    expect(consoleErrors.map((msg) => msg.text()), 'console errors').toEqual([])
  })

  test('mobile menu contains an order link that opens the order page', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await gotoHome(page)

    await page.getByRole('button', { name: 'Menü megnyitása' }).click()
    const mobileNav = page
      .getByRole('navigation', { name: 'Mobil navigáció' })
      .locator(`a[href="${ORDER_HREF}"]`)
    await expect(mobileNav).toBeVisible()
    await assertOrderLink(mobileNav, 'mobile nav order link')
    await assertNoHorizontalScroll(page, '390 open menu')

    await clickOrderAndExpectPage(page, mobileNav)
    expect(consoleErrors.map((msg) => msg.text()), 'console errors').toEqual([])
  })

  test('English labels are Order', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoHome(page)
    await page.getByRole('button', { name: /váltás angolra/i }).click()

    const headerNav = page.getByRole('navigation', { name: 'Main navigation' }).locator(`a[href="${ORDER_HREF}"]`)
    const hero = page.locator('.hero-actions').locator(`a[href="${ORDER_HREF}"]`)
    const footer = page.locator('footer').locator(`a[href="${ORDER_HREF}"]`)

    await expect(headerNav).toHaveText('Order')
    await expect(hero).toHaveText('Order')
    await expect(footer).toHaveText('Order')
    await expect(headerNav).toHaveAttribute('hreflang', 'hu')
    await expect(hero).toHaveAttribute('hreflang', 'hu')
    await expect(footer).toHaveAttribute('hreflang', 'hu')
  })

  for (const viewport of VIEWPORTS) {
    test(`no horizontal scroll at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      const consoleErrors = collectConsoleErrors(page)
      await page.setViewportSize(viewport)
      await gotoHome(page)
      await assertNoHorizontalScroll(page, `${viewport.width}`)
      expect(consoleErrors.map((msg) => msg.text()), 'console errors').toEqual([])
    })
  }

  test('CLS is 0 at 1440 and 390', async ({ browser }) => {
    const results: Record<string, number> = {}

    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 390, height: 844 },
    ]) {
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
    fs.writeFileSync(path.join(outDir, 'order-entry-cls.json'), `${JSON.stringify(results, null, 2)}\n`)

    expect(results['1440'], `CLS 1440=${results['1440']}`).toBe(0)
    expect(results['390'], `CLS 390=${results['390']}`).toBe(0)
  })

  test('screenshots hero, footer and open mobile menu', async ({ page }) => {
    fs.mkdirSync(ARTIFACTS, { recursive: true })
    await page.emulateMedia({ reducedMotion: 'reduce' })

    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoHome(page)
    await page.screenshot({
      path: path.join(ARTIFACTS, 'order_entry_1440_hero.png'),
      animations: 'disabled',
    })
    await page.locator('footer').scrollIntoViewIfNeeded()
    await page.screenshot({
      path: path.join(ARTIFACTS, 'order_entry_1440_footer.png'),
      animations: 'disabled',
    })
    await page.locator('footer').screenshot({
      path: path.join(ARTIFACTS, 'order_entry_1440_footer_crop.png'),
      animations: 'disabled',
    })

    await page.setViewportSize({ width: 390, height: 844 })
    await gotoHome(page)
    await page.screenshot({
      path: path.join(ARTIFACTS, 'order_entry_390_hero.png'),
      animations: 'disabled',
    })
    await page.locator('footer').scrollIntoViewIfNeeded()
    await page.screenshot({
      path: path.join(ARTIFACTS, 'order_entry_390_footer.png'),
      animations: 'disabled',
    })
    await page.locator('footer').screenshot({
      path: path.join(ARTIFACTS, 'order_entry_390_footer_crop.png'),
      animations: 'disabled',
    })

    await page.evaluate(() => window.scrollTo(0, 0))
    await page.getByRole('button', { name: 'Menü megnyitása' }).click()
    await expect(
      page.getByRole('navigation', { name: 'Mobil navigáció' }).locator(`a[href="${ORDER_HREF}"]`),
    ).toBeVisible()
    await page.screenshot({
      path: path.join(ARTIFACTS, 'order_entry_390_menu.png'),
      animations: 'disabled',
    })
  })
})
