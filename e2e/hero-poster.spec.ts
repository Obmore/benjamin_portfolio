import { expect, test } from '@playwright/test'

for (const width of [360, 390, 1024, 1440]) {
  test(`static fallback at ${width} when optional motion is unavailable`, async ({ page }) => {
    await page.route('**/assets/portfolio-*.js', route => route.abort())
    const requests: string[] = [], errors: string[] = []
    page.on('request', req => requests.push(req.url()))
    page.on('pageerror', err => errors.push(err.message))
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.locator('.hero-3d-poster-host > svg')).toBeVisible()
    await expect(page.locator('.hero-figure canvas')).toHaveCount(0)
    expect(requests.filter(url => /hero3d|\.glb|k1-p0|detect-gpu|\/three-/.test(url))).toEqual([])
    expect(errors).toEqual([])
    await page.screenshot({ path: `test-results/hero-poster-${width}.png`, fullPage: true })
  })
}
