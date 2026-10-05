import { test, expect } from '@playwright/test'

// Exercise intermediate poses with a controlled clock; endpoint snapshots
// alone cannot catch a dock painting over the moving steering column.
for (const angle of ['-42', '-24', '-8']) test(`Rollin motion remains coherent at ${angle} degrees`, async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 1000 })
  await page.goto('/#munka-hotel-rental', { waitUntil: 'networkidle' })
  await page.getByRole('slider', { name: 'Nézőpont' }).fill(angle)
  await page.clock.install({ time: new Date('2026-10-05T10:00:00Z') })
  await page.clock.pauseAt(new Date('2026-10-05T10:00:01Z'))
  const checkPose = async (stage: string) => {
    await expect(page.locator('.rd-shell')).toHaveAttribute('data-stage', stage)
    const paths = await page.locator('.rd-render').evaluate((svg: SVGSVGElement) => {
      const paths = [...svg.querySelectorAll('path')]
      const lastHousing = paths.findLastIndex(p => p.getAttribute('fill') === '#244b58')
      const stem = paths.findIndex(p => p.getAttribute('stroke') === '#94b1bb')
      const clipped = paths.filter(p => {
        const b = p.getBBox(), v = svg.viewBox.baseVal, pad = Number(p.getAttribute('stroke-width') ?? 0) / 2
        return b.x - pad < v.x || b.y - pad < v.y || b.x + b.width + pad > v.x + v.width || b.y + b.height + pad > v.y + v.height
      }).length
      return { lastHousing, stem, clipped }
    })
    expect(paths.lastHousing).toBeGreaterThan(-1)
    expect(paths.stem).toBeGreaterThan(paths.lastHousing)
    expect(paths.clipped).toBe(0)
    await expect(page.locator('.rd-scene')).toHaveScreenshot(`rollin-${angle}-${stage}.png`, { maxDiffPixelRatio: .001 })
  }
  await page.locator('.rd-action').click()
  await page.clock.runFor(650)
  await checkPose('open')
  await page.clock.runFor(600)
  await checkPose('leaving')
  await page.clock.runFor(500)
  await expect(page.locator('.rd-shell')).toHaveAttribute('data-stage', 'ride')
  await page.locator('.rd-action').click()
  await page.clock.runFor(450)
  await checkPose('return')
  await page.clock.runFor(550)
  await checkPose('locking')
})
