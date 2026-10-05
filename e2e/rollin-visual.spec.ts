import { test, expect } from '@playwright/test'

// Baselines are reviewed artwork, not automatically accepted screenshots.
// Use the pinned Playwright Chromium on Windows (see docs/interactive-experience.md).
for (const width of [390, 1440]) for (const angle of ['-42', '-24', '-8']) {
  test(`${width}, viewpoint ${angle}: station geometry through the rental cycle`, async ({ page }) => {
    const errors: string[] = []
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    page.on('pageerror', error => errors.push(error.message))
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/#munka-hotel-rental', { waitUntil: 'networkidle' })
    await page.getByRole('slider', { name: 'Nézőpont' }).fill(angle)
    for (const stage of ['docked', 'ride', 'charge']) {
      await expect(page.locator('.rd-shell')).toHaveAttribute('data-stage', stage)
      await expect(page.locator('.rd-scene')).toHaveScreenshot(`rollin-${width}-${angle}-${stage}.png`, { maxDiffPixelRatio: .001 })
      await page.locator('.rd-action').click()
    }
    expect(errors).toEqual([])
  })
}

test('unlock stays busy until the vehicle stops; idle artwork does not keep repainting', async ({ page }) => {
  await page.goto('/#munka-hotel-rental', { waitUntil: 'networkidle' })
  await page.clock.install({ time: new Date('2026-10-05T10:00:00Z') })
  await page.clock.pauseAt(new Date('2026-10-05T10:00:01Z'))
  const action = page.locator('.rd-action'), shell = page.locator('.rd-shell')
  await action.click()
  await page.clock.runFor(900)
  await expect(shell).toHaveAttribute('data-stage', 'leaving')
  await expect(action).toHaveAttribute('aria-disabled', 'true')
  await action.dispatchEvent('click')
  await expect(shell).toHaveAttribute('data-stage', 'leaving')
  await page.clock.runFor(900)
  await expect(shell).toHaveAttribute('data-stage', 'ride')
  await expect(page.locator('.rd-render')).toHaveAttribute('data-motion', 'idle')
  await page.clock.resume()
  const mutations = await page.locator('.rd-render').evaluate(svg => new Promise<number>(resolve => {
    let changes = 0
    const observer = new MutationObserver(records => { changes += records.length })
    observer.observe(svg, { attributes: true, childList: true, subtree: true })
    setTimeout(() => { observer.disconnect(); resolve(changes) }, 300)
  }))
  expect(mutations).toBe(0)
})

test('a renderer failure restores the description while other project controls still work', async ({ page }) => {
  await page.addInitScript(() => {
    const original = SVGSVGElement.prototype.setAttribute
    SVGSVGElement.prototype.setAttribute = function (name, value) {
      if (this.classList.contains('rd-render') && name === 'viewBox') throw new Error('Simulated renderer failure')
      original.call(this, name, value)
    }
  })
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto('/#munka-hotel-rental', { waitUntil: 'networkidle' })
  await expect(page.locator('[data-rollin-demo] > p')).toBeVisible()
  await expect(page.locator('.rd-shell')).toHaveCount(0)
  await page.locator('#munka-anettesvendi .work-device-toggle').click()
  await expect(page.locator('#munka-anettesvendi .work-device-toggle')).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: /EN.*váltás angolra/ }).click()
  await expect(page.locator('[data-rollin-demo] > p')).toContainText('project description')
  expect(errors).toEqual([])
})

test('leaving the scene finishes an active rental transition', async ({ page }) => {
  await page.goto('/#munka-hotel-rental', { waitUntil: 'networkidle' })
  await page.locator('.rd-action').click()
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await expect(page.locator('.rd-shell')).toHaveAttribute('data-stage', 'ride')
  await expect(page.locator('.rd-render')).toHaveAttribute('data-motion', 'idle')
})
