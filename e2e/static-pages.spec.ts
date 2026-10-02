import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'

const ARTIFACTS = '/opt/cursor/artifacts'
const ORDER_URL = /https?:\/\/127\.0\.0\.1:\d+\/megrendeles\/(?:\?.*)?(?:#.*)?$/
const LIGHT_PAPER = 'rgb(250, 251, 252)'

function dist(...parts: string[]) {
  return path.join(process.cwd(), 'dist', ...parts)
}

async function waitForOrder(page: Page) {
  await page.waitForURL(ORDER_URL)
  await expect(page.locator('h1')).toHaveText('Megrendelés és ajánlatkérés')
}

test.describe('static GitHub Pages helpers', () => {
  test('dist contains 404.html and megrendelo/index.html', () => {
    const notFound = fs.readFileSync(dist('404.html'), 'utf8')
    const redirect = fs.readFileSync(dist('megrendelo/index.html'), 'utf8')

    expect(notFound).toContain('Ez az oldal nem található.')
    expect(notFound).toContain("location.replace('/megrendeles/' + location.search + location.hash)")
    expect(redirect).toContain("location.replace('/megrendeles/' + location.search + location.hash)")
    expect(redirect).toContain('Tovább a megrendeléshez')
    expect(redirect).toContain('https://ottbenjamin.hu/megrendeles/')
  })

  test('/megrendelo and /megrendelo/ land on /megrendeles/ with 200', async ({ page }) => {
    for (const from of ['/megrendelo', '/megrendelo/']) {
      const response = await page.goto(from, { waitUntil: 'networkidle' })
      expect(response, `${from} final response`).toBeTruthy()
      expect(response!.status(), `${from} final status`).toBe(200)
      await waitForOrder(page)
    }
  })

  test('/megrendelo keeps query and hash', async ({ page }) => {
    await page.goto('/megrendelo?ref=card#kapcsolat-email', { waitUntil: 'networkidle' })
    await waitForOrder(page)
    expect(new URL(page.url()).search).toBe('?ref=card')
    expect(new URL(page.url()).hash).toBe('#kapcsolat-email')
  })

  test('known typos on the 404 page go to /megrendeles/', async ({ page }) => {
    for (const from of ['/rendeles', '/megrendelés', '/megrendel%C3%A9s']) {
      const initial = await page.goto(from, { waitUntil: 'domcontentloaded' })
      expect(initial?.status(), `${from} is served as 404.html`).toBe(404)
      await waitForOrder(page)
      const landed = await page.request.get('/megrendeles/')
      expect(landed.status(), `${from} finally 200`).toBe(200)
    }
  })

  test('/nincs-ilyen serves the 404 page', async ({ page }) => {
    const requests: string[] = []
    page.on('request', (request) => requests.push(request.url()))

    const response = await page.goto('/nincs-ilyen', { waitUntil: 'networkidle' })
    expect(response, '404 response').toBeTruthy()
    expect(response!.status()).toBe(404)
    await expect(page.locator('h1')).toHaveText('Ez az oldal nem található.')
    await expect(page.getByText('This page could not be found.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Vissza a főoldalra' })).toHaveAttribute(
      'href',
      '/',
    )
    await expect(page.locator('a[href="/megrendeles/"], a[href="/megrendeles"]')).toHaveCount(0)
    await expect(page.locator('form, input, textarea, select')).toHaveCount(0)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex')

    const pageOrigin = new URL(page.url()).origin
    const external = requests.filter((url) => {
      return !url.startsWith(pageOrigin) && !url.startsWith('data:')
    })
    expect(external, 'no third-party requests').toEqual([])
  })

  test('404 stays light when the browser prefers dark', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/nincs-ilyen', { waitUntil: 'domcontentloaded' })
    const colors = await page.evaluate(() => {
      const body = getComputedStyle(document.body)
      const html = getComputedStyle(document.documentElement)
      return {
        body: body.backgroundColor,
        html: html.backgroundColor,
        scheme: body.colorScheme || html.colorScheme,
      }
    })
    expect(colors.body).toBe(LIGHT_PAPER)
    expect(colors.html).toBe(LIGHT_PAPER)
    expect(colors.scheme).toMatch(/light/)
  })

  test('404 is readable at 360, 390 and 1440', async ({ page }) => {
    fs.mkdirSync(ARTIFACTS, { recursive: true })
    const shots = [
      { width: 360, height: 800, name: '404_readable_360x800.png' },
      { width: 390, height: 844, name: '404_merge_390x844.png' },
      { width: 1440, height: 900, name: '404_merge_1440x900.png' },
    ] as const

    for (const shot of shots) {
      await page.setViewportSize({ width: shot.width, height: shot.height })
      const response = await page.goto('/nincs-ilyen', { waitUntil: 'networkidle' })
      expect(response?.status()).toBe(404)
      await expect(page.locator('h1')).toBeVisible()
      await expect(page.getByRole('link', { name: 'Vissza a főoldalra' })).toBeVisible()
      const overflow = await page.evaluate(() => {
        const root = document.documentElement
        return { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth }
      })
      expect(
        overflow.scrollWidth,
        `horizontal scroll at ${shot.width}`,
      ).toBeLessThanOrEqual(overflow.clientWidth + 1)
      await page.screenshot({
        path: path.join(ARTIFACTS, shot.name),
        fullPage: true,
        animations: 'disabled',
      })
    }
  })

  test('screenshot /megrendelo landing on /megrendeles/', async ({ page }) => {
    fs.mkdirSync(ARTIFACTS, { recursive: true })
    await page.setViewportSize({ width: 1440, height: 900 })
    const response = await page.goto('/megrendelo', { waitUntil: 'networkidle' })
    expect(response?.status()).toBe(200)
    await waitForOrder(page)
    await page.screenshot({
      path: path.join(ARTIFACTS, 'megrendelo_redirect_landing_1440.png'),
      fullPage: true,
      animations: 'disabled',
    })
  })
})
