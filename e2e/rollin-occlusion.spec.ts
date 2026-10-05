import { test, expect, type Page } from '@playwright/test'

async function expectVisibleReflector(page: Page, context: string) {
  const exposed = await page.locator('.rd-render path[stroke="#e2edee"]').evaluate((path: SVGPathElement) => {
    const transform = path.getScreenCTM()!
    return [.3, .5, .7, .85].map(fraction => {
      const point = path.getPointAtLength(path.getTotalLength() * fraction).matrixTransform(transform)
      return document.elementFromPoint(point.x, point.y) === path
    })
  })
  expect(exposed, context).toEqual([true, true, true, true])
}

// Hit-test the rendered surface instead of accepting a screenshot of a hidden
// reflector. The previous depth order flipped between -24 and -23 degrees.
for (const width of [390, 1440]) for (const stage of ['docked', 'ride', 'charge']) {
  test(`${width}: attached scooter details stay visible through every viewpoint while ${stage}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/#munka-hotel-rental', { waitUntil: 'networkidle' })
    for (let i = 0; i < ['docked', 'ride', 'charge'].indexOf(stage); i++) await page.locator('.rd-action').click()
    await expect(page.locator('.rd-shell')).toHaveAttribute('data-stage', stage)
    for (let angle = -42; angle <= -8; angle++) {
      await page.getByRole('slider', { name: 'Nézőpont' }).fill(String(angle))
      await page.locator('.rd-scene').scrollIntoViewIfNeeded()
      await expectVisibleReflector(page, `${width}px, ${stage}, ${angle} degrees`)
    }
  })
}

test('attached details stay visible when changing viewpoint during departure and return', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 1000 })
  await page.goto('/#munka-hotel-rental', { waitUntil: 'networkidle' })
  await page.clock.install({ time: new Date('2026-10-05T10:00:00Z') })
  await page.clock.pauseAt(new Date('2026-10-05T10:00:01Z'))
  const sweep = async () => {
    for (const angle of [-42, -24, -23, -8, -24]) {
      await page.getByRole('slider', { name: 'Nézőpont' }).fill(String(angle))
      await expectVisibleReflector(page, `moving, ${angle} degrees`)
    }
  }
  await page.locator('.rd-action').click()
  await page.clock.runFor(650)
  await expect(page.locator('.rd-shell')).toHaveAttribute('data-stage', 'open')
  await sweep()
  await page.clock.runFor(600)
  await expect(page.locator('.rd-shell')).toHaveAttribute('data-stage', 'leaving')
  await sweep()
  await page.clock.runFor(500)
  await page.locator('.rd-action').click()
  await page.clock.runFor(450)
  await expect(page.locator('.rd-shell')).toHaveAttribute('data-stage', 'return')
  await sweep()
  await page.clock.runFor(550)
  await expect(page.locator('.rd-shell')).toHaveAttribute('data-stage', 'locking')
  await sweep()
})
