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

function contrastRatio(fg: string, bg: string): number {
  const parse = (value: string) => {
    const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
    if (!match) throw new Error(`Cannot parse color: ${value}`)
    return [Number(match[1]), Number(match[2]), Number(match[3])] as const
  }
  const lum = (channel: readonly [number, number, number]) => {
    const srgb = channel.map((part) => {
      const v = part / 255
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2]
  }
  const l1 = lum(parse(fg))
  const l2 = lum(parse(bg))
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

async function assertOrderLink(link: Locator, label: string, expectedText = 'Megrendelés'): Promise<void> {
  await expect(link, label).toHaveCount(1)
  await expect(link).toHaveAttribute('href', ORDER_HREF)
  await expect(link).toHaveText(expectedText)
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

    const headerNav = page.getByRole('navigation', { name: 'Fő navigáció' }).locator(`a[href="${ORDER_HREF}"]`)
    const mobileNav = page.getByRole('navigation', { name: 'Mobil navigáció' }).locator(`a[href="${ORDER_HREF}"]`)
    const hero = page.locator('.hero-actions').locator(`a[href="${ORDER_HREF}"]`)
    const contact = page.locator('#kapcsolat').locator(`a[href="${ORDER_HREF}"]`)
    const footer = page.locator('footer').locator(`a[href="${ORDER_HREF}"]`)

    await assertOrderLink(headerNav, 'desktop nav')
    await assertOrderLink(mobileNav, 'mobile nav')
    await assertOrderLink(hero, 'hero')
    await assertOrderLink(contact, 'contact')
    await assertOrderLink(footer, 'footer')

    await expect(headerNav).toHaveAttribute('lang', 'hu')
    await expect(hero).toHaveAttribute('lang', 'hu')

    const navItems = page.getByRole('navigation', { name: 'Fő navigáció' }).locator('button, a')
    await expect(navItems.last()).toHaveText('Megrendelés')
    await expect(navItems.nth(-2)).toHaveText('Kapcsolat')

    await expect(page.locator('.hero-actions a, .hero-actions button')).toHaveCount(1)
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
    expect(heroBox!.y, 'CTA below the role line').toBeGreaterThan(headingBox!.y + headingBox!.height)
    expect(heroBox!.y, 'CTA below the subhead').toBeGreaterThan(subBox!.y + subBox!.height - 1)
    expect(heroBox!.height, 'hero CTA min-h-11').toBeGreaterThanOrEqual(44)

    const colors = await hero.evaluate((el) => {
      const style = getComputedStyle(el)
      return { color: style.color, background: style.backgroundColor }
    })
    expect(contrastRatio(colors.color, colors.background), 'hero CTA contrast').toBeGreaterThanOrEqual(4.5)

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
    const headerNav = page.getByRole('navigation', { name: 'Main navigation' }).locator(`a[href="${ORDER_HREF}"]`)
    const hero = page.locator('.hero-actions').locator(`a[href="${ORDER_HREF}"]`)
    const contact = page.locator('#kapcsolat').locator(`a[href="${ORDER_HREF}"]`)
    const footer = page.locator('footer').locator(`a[href="${ORDER_HREF}"]`)

    await expect(headerNav).toHaveText('Order')
    await expect(hero).toHaveText('Order')
    await expect(contact).toHaveText('Order')
    await expect(footer).toHaveText('Order')
    await expect(orderLinks(page)).toHaveCount(5)
  })

  test('desktop nav stays on one line at 1024 and 1440', async ({ page }) => {
    for (const width of [1024, 1440]) {
      await page.setViewportSize({ width, height: 800 })
      await gotoHome(page)
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
    fs.writeFileSync(path.join(outDir, 'order-entry-cls.json'), `${JSON.stringify(results, null, 2)}\n`)

    expect(results['360'], `CLS 360=${results['360']}`).toBe(0)
    expect(results['390'], `CLS 390=${results['390']}`).toBe(0)
    expect(results['1440'], `CLS 1440=${results['1440']}`).toBe(0)
  })

  test('screenshots hero, open mobile menu and footer', async ({ page }) => {
    fs.mkdirSync(ARTIFACTS, { recursive: true })
    await page.emulateMedia({ reducedMotion: 'reduce' })

    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoHome(page)
    await page.screenshot({
      path: path.join(ARTIFACTS, 'go_hero_1440.png'),
      animations: 'disabled',
    })
    await page.locator('footer').scrollIntoViewIfNeeded()
    await page.screenshot({
      path: path.join(ARTIFACTS, 'go_footer_1440.png'),
      animations: 'disabled',
    })

    await page.setViewportSize({ width: 390, height: 844 })
    await gotoHome(page)
    await page.screenshot({
      path: path.join(ARTIFACTS, 'go_hero_390.png'),
      animations: 'disabled',
    })
    await page.locator('footer').scrollIntoViewIfNeeded()
    await page.screenshot({
      path: path.join(ARTIFACTS, 'go_footer_390.png'),
      animations: 'disabled',
    })

    await page.evaluate(() => window.scrollTo(0, 0))
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
