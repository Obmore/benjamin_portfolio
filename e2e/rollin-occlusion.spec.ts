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

async function expectDockFacesAboveBase(page: Page, context: string) {
  const faces = await page.locator('.rd-render path[fill="#244b58"]').evaluateAll(paths => paths.map(element => {
    const path = element as SVGPathElement
    // A projected Box face is a four-corner polygon. Probe its lower interior,
    // where the plinth used to erase the far dock despite valid 3D coordinates.
    const values = path.getAttribute('d')!.match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi)!.map(Number)
    if (values.length !== 8) throw new Error('Expected a rectangular dock face')
    const [a, b, c, d] = Array.from({ length: 4 }, (_, i) => ({ x: values[i * 2], y: values[i * 2 + 1] }))
    const baseColors = ['#fcfefd', '#b9cdce', '#88a7af', '#a2babe']
    return [.25, .5, .75].flatMap(u => [.85, .95].map(v => {
      const point = new DOMPoint(
        (1 - v) * ((1 - u) * a.x + u * b.x) + v * ((1 - u) * d.x + u * c.x),
        (1 - v) * ((1 - u) * a.y + u * b.y) + v * ((1 - u) * d.y + u * c.y),
      ).matrixTransform(path.getScreenCTM()!)
      const top = document.elementFromPoint(point.x, point.y)
      // The moving scooter may legitimately cover its dock; the supporting
      // plinth must never cover any part of the dock front above its feet.
      return top !== null && !baseColors.includes(top.getAttribute('fill') ?? '')
    }))
  }))
  expect(faces, context).toEqual(Array.from({ length: 4 }, () => Array(6).fill(true)))
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
      await expectDockFacesAboveBase(page, `${width}px, ${stage}, ${angle} degrees: dock above plinth`)
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
      await expectDockFacesAboveBase(page, `moving, ${angle} degrees: dock above plinth`)
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
