import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type ConsoleMessage, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const ORDER_PATH = '/megrendeles/'
const EMAIL = 'bendzsiott1998@gmail.com'
const VIEWPORTS = [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
] as const

const ARTIFACTS = '/opt/cursor/artifacts'

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

async function gotoOrder(page: Page): Promise<void> {
  const response = await page.goto(ORDER_PATH, { waitUntil: 'networkidle' })
  expect(response, 'navigation response').toBeTruthy()
  expect(response!.status(), `${ORDER_PATH} status`).toBe(200)
  await page.evaluate(() => document.fonts.ready)
}

test.describe('/megrendeles/', () => {
  for (const viewport of VIEWPORTS) {
    test(`layout ${viewport.width}x${viewport.height}`, async ({ page }) => {
      const consoleErrors = collectConsoleErrors(page)
      await page.setViewportSize(viewport)
      await gotoOrder(page)

      await expect(page.locator('form, input, textarea, select')).toHaveCount(0)
      await expect(page.locator('#mg-write')).toHaveAttribute(
        'href',
        `mailto:${EMAIL}?subject=Megrendel%C3%A9s`,
      )
      await expect(page.locator('#mg-email-text')).toHaveText(EMAIL)
      await expect(page.locator('#adatkezeles')).toHaveCount(0)

      const overflow = await page.evaluate(() => {
        const root = document.documentElement
        return {
          scrollWidth: root.scrollWidth,
          clientWidth: root.clientWidth,
        }
      })
      expect(
        overflow.scrollWidth,
        `horizontal scroll at ${viewport.width}`,
      ).toBeLessThanOrEqual(overflow.clientWidth + 1)

      const axe = await new AxeBuilder({ page }).analyze()
      expect(axe.violations, JSON.stringify(axe.violations, null, 2)).toEqual([])

      expect(
        consoleErrors.map((msg) => msg.text()),
        'console errors',
      ).toEqual([])
    })
  }

  test('keyboard order and mailto subjects', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoOrder(page)

    await page.keyboard.press('Tab')
    await expect(page.locator('.mg-skip')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.locator('.mg-back')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.locator('[data-subject="Megrendelés"]')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.locator('[data-subject="Ajánlatkérés"]')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.locator('#mg-write')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.locator('#mg-copy')).toBeFocused()

    await page.locator('[data-subject="Ajánlatkérés"]').click()
    await expect(page.locator('#mg-write')).toBeFocused()
    await expect(page.locator('#mg-write')).toHaveAttribute(
      'href',
      `mailto:${EMAIL}?subject=Aj%C3%A1nlatk%C3%A9r%C3%A9s`,
    )

    await page.locator('[data-subject="Megrendelés"]').click()
    await expect(page.locator('#mg-write')).toHaveAttribute(
      'href',
      `mailto:${EMAIL}?subject=Megrendel%C3%A9s`,
    )
  })

  test('readable without JavaScript', async ({ browser }) => {
    const page = await browser.newPage({ javaScriptEnabled: false })
    await page.setViewportSize({ width: 390, height: 844 })
    const response = await page.goto(ORDER_PATH)
    expect(response?.status()).toBe(200)
    await expect(page.locator('#mg-email-text')).toHaveText(EMAIL)
    await expect(page.locator('h1')).toHaveText('Megrendelés és ajánlatkérés')
    await expect(page.locator('form, input, textarea')).toHaveCount(0)
    await expect(page.locator('#mg-write')).toHaveAttribute(
      'href',
      `mailto:${EMAIL}?subject=Megrendel%C3%A9s`,
    )
    await page.close()
  })

  test('main page stays isolated', async ({ page }) => {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' })
    expect(response?.status()).toBe(200)
    await expect(page.locator('a[href="/megrendeles/"], a[href="/megrendeles"]')).toHaveCount(0)
    const canonical = page.locator('link[rel="canonical"]')
    await expect(canonical).toHaveAttribute('href', 'https://ottbenjamin.hu/')
  })

  test('copy button announces with reserved status row', async ({ page, context, browserName }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.setViewportSize({ width: 390, height: 844 })
    await gotoOrder(page)

    const statusBox = page.locator('#mg-status')
    const before = await statusBox.evaluate((el) => el.getBoundingClientRect().height)
    expect(before).toBe(20)

    await page.locator('#mg-copy').click()
    await expect(statusBox).toHaveText('Az e-mail-cím a vágólapra került.')

    const after = await statusBox.evaluate((el) => el.getBoundingClientRect().height)
    expect(after).toBe(20)

    if (browserName === 'chromium') {
      const copied = await page.evaluate(() => navigator.clipboard.readText())
      expect(copied).toBe(EMAIL)
    }
  })

  test('CLS at 1440 and 390', async ({ browser }) => {
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
      await page.goto(ORDER_PATH, { waitUntil: 'networkidle' })
      await page.evaluate(() => document.fonts.ready)
      await page.waitForTimeout(1500)
      const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls)
      results[String(viewport.width)] = cls
      await page.close()
    }

    const outDir = path.join(process.cwd(), 'test-results')
    fs.mkdirSync(outDir, { recursive: true })
    fs.writeFileSync(path.join(outDir, 'cls.json'), `${JSON.stringify(results, null, 2)}\n`)

    expect(results['1440'], `CLS 1440=${results['1440']}`).toBeLessThan(0.05)
    expect(results['390'], `CLS 390=${results['390']}`).toBeLessThan(0.05)
  })

  test('screenshots 1440 / 390 / 360', async ({ page }) => {
    fs.mkdirSync(ARTIFACTS, { recursive: true })
    const shots = [
      { width: 1440, height: 900, name: 'megrendeles_1440.png' },
      { width: 390, height: 844, name: 'megrendeles_390.png' },
      { width: 360, height: 800, name: 'megrendeles_360.png' },
    ] as const

    for (const shot of shots) {
      await page.setViewportSize({ width: shot.width, height: shot.height })
      await gotoOrder(page)
      await page.screenshot({
        path: path.join(ARTIFACTS, shot.name),
        fullPage: true,
        animations: 'disabled',
      })
    }
  })
})
