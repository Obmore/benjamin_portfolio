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

const ARTIFACTS = path.join(process.cwd(), 'test-results')

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

      await expect(page.locator('form, input')).toHaveCount(0)
      await expect(page.locator('#mg-service')).toBeVisible()
      await expect(page.locator('#mg-description')).toBeVisible()
      expect(new URL((await page.locator('#mg-write').getAttribute('href'))!).searchParams.get('subject')).toBe('Megrendelés')
      await expect(page.locator('a[href*="Aj%C3%A1nlatk%C3%A9r%C3%A9s"]')).toHaveCount(0)
      await expect(page.locator('#mg-email-text')).toHaveText(EMAIL)
      await expect(page.locator('#adatkezeles')).toHaveCount(0)
      await expect(page.locator('.mg-kicker')).toHaveCount(0)
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex')
      await expect(page.locator('.mg-plan')).toHaveCount(6)
      await expect(page.locator('.mg-plan').nth(4).locator('.mg-list li')).toHaveText([
        'legfeljebb hat tartalmi rész, például bemutatkozás, szolgáltatások, munkák, elérhetőség',
        'legalább hat, legfeljebb tíz fotó, amelyet Ön ad át, és amelyek felhasználására jogosult',
        'kapcsolatfelvételi lehetőség',
        'alapvető keresőbeállítás: oldalcím és leírás a Google-találatokhoz, valamint az oldal regisztrálása a Google Search Console-ban',
        'egy javítási kör',
      ])
      await expect(page.locator('.mg-plan').nth(4).locator('.mg-price')).toHaveText('129 000 Ft egyszeri díj.')
      await expect(page.locator('body')).not.toContainText('alanyi adómentes')
      await expect(page.locator('body')).not.toContainText('59 000')

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

      const writeBox = await page.locator('#mg-write').boundingBox()
      const copyBox = await page.locator('#mg-copy').boundingBox()
      expect(writeBox).toBeTruthy()
      expect(copyBox).toBeTruthy()
      if (viewport.width >= 390) {
        expect(copyBox!.y, `mail buttons in one row at ${viewport.width}`).toBeCloseTo(
          writeBox!.y,
          0,
        )
      } else {
        expect(copyBox!.y).toBeGreaterThan(writeBox!.y + 40)
        expect(Math.abs(copyBox!.width - writeBox!.width)).toBeLessThan(2)
      }

      const axe = await new AxeBuilder({ page }).analyze()
      expect(axe.violations, JSON.stringify(axe.violations, null, 2)).toEqual([])

      expect(
        consoleErrors.map((msg) => msg.text()),
        'console errors',
      ).toEqual([])
    })
  }

  test('keyboard order and unified mailto subject', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoOrder(page)

    const planLinks = page.locator('.mg-plan-cta')
    await page.keyboard.press('Tab')
    await expect(page.locator('.mg-skip')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.locator('.mg-back')).toBeFocused()
    const controls = [page.locator('.mg-text-link'), ...await page.locator('[data-flow-step]').all(), ...await page.locator('.mg-choose a').all(), ...await planLinks.all(), ...await page.locator('.mg-faq summary').all(), page.locator('#mg-service'), page.locator('#mg-description')]
    for (const control of controls) {
      await page.keyboard.press('Tab')
      await expect(control).toBeFocused()
    }
    await page.keyboard.press('Tab')
    await expect(page.locator('#mg-write')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.locator('#mg-copy')).toBeFocused()

    await planLinks.nth(1).click()
    await expect(page.locator('#mg-description')).toBeFocused()
    expect(new URL((await page.locator('#mg-write').getAttribute('href'))!).searchParams.get('subject')).toBe('Megrendelés')

    await planLinks.nth(0).click()
    expect(new URL((await page.locator('#mg-write').getAttribute('href'))!).searchParams.get('subject')).toBe('Megrendelés')
  })

  test('readable without JavaScript', async ({ browser }) => {
    fs.mkdirSync(ARTIFACTS, { recursive: true })
    const page = await browser.newPage({ javaScriptEnabled: false })
    await page.setViewportSize({ width: 390, height: 844 })
    const response = await page.goto(ORDER_PATH)
    expect(response?.status()).toBe(200)
    await expect(page.locator('#mg-email-text')).toHaveText(EMAIL)
    await expect(page.locator('h1')).toHaveText('Megrendelés és ajánlatkérés')
    await expect(page.locator('form, input')).toHaveCount(0)
    await expect(page.locator('.mg-brief')).toBeHidden()
    await expect(page.locator('#mg-draft-fallback')).toBeHidden()
    await expect(page.locator('#mg-write')).toHaveAttribute(
      'href',
      `mailto:${EMAIL}?subject=Megrendel%C3%A9s`,
    )
    await expect(page.locator('#mg-copy')).toBeHidden()
    await expect(page.locator('.mg-kicker')).toHaveCount(0)
    await page.screenshot({
      path: path.join(ARTIFACTS, 'megrendeles_kor2_390_nojs.png'),
      fullPage: true,
      animations: 'disabled',
    })
    await page.close()
  })

  test('main page has five /megrendeles/ links including one in #kapcsolat', async ({ page }) => {
    const response = await page.goto('/', { waitUntil: 'networkidle' })
    expect(response?.status()).toBe(200)
    const canonical = page.locator('link[rel="canonical"]')
    await expect(canonical).toHaveAttribute('href', 'https://ottbenjamin.hu/')

    async function assertOrderEntryPoints() {
      const all = page.locator('a[href="/megrendeles/"]')
      await expect(all).toHaveCount(5)
      await expect(page.locator('#kapcsolat a[href="/megrendeles/"]')).toHaveCount(1)
      await expect(page.locator('header a[href="/megrendeles/"]')).toHaveCount(2)
      await expect(page.locator('.hero-actions a[href="/megrendeles/"]')).toHaveCount(1)
      await expect(page.locator('footer a[href="/megrendeles/"]')).toHaveCount(1)
      const contact = page.locator('#kapcsolat a[href="/megrendeles/"]')
      const htmlLang = await page.locator('html').getAttribute('lang')
      const orderLabel = htmlLang === 'en' ? 'Order' : 'Megrendelés'
      const workLabel = htmlLang === 'en' ? 'My work' : 'Munkáim'
      const cvLabel = htmlLang === 'en' ? 'Download resume' : 'Önéletrajz letöltése'
      await expect(contact).not.toHaveAttribute('lang')
      await expect(contact).toHaveText(orderLabel)
      const orderCount = await all.count()
      for (let i = 0; i < orderCount; i += 1) {
        await expect(all.nth(i)).not.toHaveAttribute('lang')
      }
      const heroActions = page.locator('.hero-actions a, .hero-actions button')
      await expect(heroActions).toHaveCount(3)
      await expect(heroActions.nth(0)).toHaveText(workLabel)
      await expect(heroActions.nth(1)).toContainText(cvLabel)
      await expect(heroActions.nth(2)).toHaveText(orderLabel)
      const bodyText = await page.locator('body').innerText()
      expect([...bodyText.matchAll(/ajánlat/gi)].length, 'S1 ajánlat count').toBe(0)
    }

    await assertOrderEntryPoints()
    await page.getByRole('button', { name: /^EN/ }).click()
    await page.waitForTimeout(400)
    await assertOrderEntryPoints()
    await page.getByRole('button', { name: /^HU/ }).click()
    await page.waitForTimeout(400)
    await assertOrderEntryPoints()
  })

  test('copy button shows Kimásolva without CLS', async ({ page, context, browserName }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.setViewportSize({ width: 390, height: 844 })
    await gotoOrder(page)

    const copy = page.locator('#mg-copy')
    const before = await copy.boundingBox()
    expect(before).toBeTruthy()

    await copy.click()
    await expect(page.locator('#mg-status')).toHaveText('E-mail-cím a vágólapra másolva')
    await expect(page.getByRole('button', { name: 'Kimásolva' })).toBeVisible()
    await expect(page.locator('.mg-copy-idle')).toBeHidden()
    await expect(page.getByText('Az e-mail-cím a vágólapra került.')).toHaveCount(0)

    const after = await copy.boundingBox()
    expect(after).toBeTruthy()
    expect(after!.width, 'copy button width stays fixed').toBeCloseTo(before!.width, 0)
    expect(after!.height).toBeCloseTo(before!.height, 0)

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
      { width: 1440, height: 900, name: 'megrendeles_kor2_1440.png' },
      { width: 390, height: 844, name: 'megrendeles_kor2_390.png' },
      { width: 360, height: 800, name: 'megrendeles_kor2_360.png' },
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
