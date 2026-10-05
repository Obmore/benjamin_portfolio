import { test, expect } from '@playwright/test'

for (const width of [360, 390, 1024, 1440]) test(`${width}: all three scroll phases stay visible beneath the header`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 })
  await page.goto('/megrendeles/', { waitUntil: 'networkidle' })
  for (const [phase, fraction] of [0, .5, 1].entries()) {
    await page.locator('.mg-flow-track').evaluate((track, fraction) => {
      const flow = track.querySelector<HTMLElement>('.mg-flow')!
      scrollTo({ top: track.getBoundingClientRect().top + scrollY - 88 + (track.clientHeight - flow.offsetHeight) * fraction, behavior: 'instant' })
    }, fraction)
    await expect(page.locator('.mg-flow')).toHaveAttribute('data-step', String(phase))
    const box = await page.locator('.mg-flow').boundingBox()
    expect(Math.abs(box!.y - 88)).toBeLessThanOrEqual(1)
    expect(box!.y + box!.height).toBeLessThanOrEqual(844)
  }
  await expect(page.getByText('Görgetés követése', { exact: true })).toHaveCount(0)
})

test('short landscape screens and reduced motion keep a compact, manually selectable illustration', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 })
  await page.goto('/megrendeles/', { waitUntil: 'networkidle' })
  expect(await page.locator('.mg-flow').evaluate(e => getComputedStyle(e).position)).not.toBe('sticky')
  for (const phase of [2, 0, 1]) {
    await page.locator(`[data-flow-step="${phase}"]`).click()
    await expect(page.locator('.mg-flow')).toHaveAttribute('data-step', String(phase))
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect(await page.locator('.mg-flow').evaluate(e => getComputedStyle(e).position)).not.toBe('sticky')
  const extra = await page.locator('.mg-flow-track').evaluate(e => e.clientHeight - e.querySelector<HTMLElement>('.mg-flow')!.offsetHeight)
  expect(extra).toBeLessThanOrEqual(1)
  await page.locator('[data-flow-step="2"]').click()
  await expect(page.locator('.mg-flow')).toHaveAttribute('data-step', '2')
})
