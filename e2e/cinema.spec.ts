import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

async function ready(page: Page) {
  await page.goto('/', { waitUntil: 'networkidle' })
  await expect(page.locator('html')).toHaveAttribute('data-spatial-motion', 'ready')
}
async function pose(page: Page, progress: number) {
  await page.locator('[data-motion-story]').evaluate((section, p) => {
    const stage = section.querySelector<HTMLElement>('.cs-sticky')!
    const top = section.getBoundingClientRect().top + scrollY - 64
    scrollTo({ top: top + (section.clientHeight - stage.clientHeight) * p, behavior: 'instant' })
  }, progress)
  await expect.poll(async () => Number(await page.locator('[data-motion-story]').getAttribute('data-progress'))).toBeCloseTo(progress, 2)
  await page.waitForTimeout(220)
}

for (const width of [360, 390, 1024, 1440]) test(`${width}: pinned reversible three chapter scene and unclipped captions`, async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 900 }, hasTouch: width < 768, isMobile: width < 768 })
  const page = await context.newPage()
  await ready(page)
  await expect(page.locator('#hero .pm-scene')).toBeVisible()
  if (width < 768) await expect(page.locator('html')).toHaveAttribute('data-spatial-quality', 'lite')
  const shapes: string[] = []
  for (const [i, p] of [.15, .5, .85].entries()) {
    await pose(page, p)
    await expect(page.locator('[data-motion-story]')).toHaveAttribute('data-chapter', String(i + 1))
    expect(Math.abs((await page.locator('.cs-sticky').boundingBox())!.y - 64)).toBeLessThanOrEqual(1)
    const caption = (await page.locator('.cs-caption[data-active="true"]').boundingBox())!
    expect(caption.x).toBeGreaterThanOrEqual(0)
    expect(caption.x + caption.width).toBeLessThanOrEqual(width)
    expect(caption.y).toBeGreaterThanOrEqual(64)
    expect(caption.y + caption.height).toBeLessThan(844)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    shapes.push((await page.locator('.cs-cube').getAttribute('style'))!)
    await page.screenshot({ path: `tmp/cinema-evidence/scene-${width}-${i + 1}.png` })
  }
  expect(new Set(shapes).size).toBe(3)
  await pose(page, .5)
  expect(await page.locator('.cs-cube').getAttribute('style')).toBe(shapes[1])
  await page.getByRole('link', { name: 'Tovább a munkáimhoz ↗' }).click()
  await expect.poll(() => page.locator('#munkaim').evaluate(e => Math.round(e.getBoundingClientRect().top))).toBe(64)
  await context.close()
})

for (const width of [390, 1440]) test(`${width}: refresh always starts at hero, fresh deep links still work`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 })
  await page.goto('/#kapcsolat', { waitUntil: 'networkidle' })
  await expect.poll(() => page.locator('#kapcsolat').evaluate(e => Math.abs(e.getBoundingClientRect().top - 64))).toBeLessThanOrEqual(1)
  await page.reload({ waitUntil: 'networkidle' })
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0)
  expect(new URL(page.url()).hash).toBe('')
  await pose(page, .5)
  await page.reload({ waitUntil: 'networkidle' })
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0)
  await page.waitForTimeout(700)
  expect(await page.evaluate(() => scrollY)).toBe(0)
})

test('language updates scene captions and live reduced motion freezes without layout jump', async ({ page }) => {
  await ready(page)
  await page.getByRole('button', { name: /EN.*váltás angolra/ }).click()
  await expect(page.locator('.cs-eyebrow-label')).toHaveText('BEHIND THE SURFACE')
  expect(await page.locator('.cs-caption h2').allTextContents()).toEqual(['A signal becomes action.', 'The pieces work together.', 'Try a real-world example.'])
  await pose(page, .5)
  const geometry = await page.locator('[data-motion-story]').boundingBox()
  const transform = await page.locator('.cs-cube').getAttribute('style')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.locator('html')).toHaveAttribute('data-spatial-motion', 'paused')
  expect(await page.locator('[data-motion-story]').boundingBox()).toEqual(geometry)
  await page.mouse.wheel(0, 100)
  await page.waitForTimeout(350)
  expect(await page.locator('.cs-cube').getAttribute('style')).toBe(transform)
})

test('stationary project wrapper prevents transform feedback and motion chunk failure leaves static page usable', async ({ page }) => {
  await ready(page)
  await page.locator('.work-shot').first().scrollIntoViewIfNeeded()
  // Let the existing entrance reveal settle before testing a stationary pointer.
  await page.waitForTimeout(900)
  const wrapper = page.locator('.work-shot').first(), frame = page.locator('.work-shot-frame').first()
  const box = (await wrapper.boundingBox())!
  await page.mouse.move(box.x + 50, box.y + 60)
  await page.waitForTimeout(100)
  const transform = await frame.getAttribute('style')
  for (let i = 0; i < 5; i++) { await page.mouse.move(box.x + 50, box.y + 60); await page.waitForTimeout(30) }
  expect(await frame.getAttribute('style')).toBe(transform)
  await page.route('**/assets/portfolio-*.js', route => route.abort())
  await page.reload({ waitUntil: 'networkidle' })
  await expect(page.locator('[data-motion-story]')).toBeHidden()
  await expect(page.locator('.hero-3d-poster-host > svg')).toBeVisible()
  await page.getByRole('button', { name: 'Munkáim', exact: true }).click()
  await expect(page.locator('#munkaim')).toBeInViewport()
})

for (const width of [390, 1440]) test(`${width}: delayed motion failure preserves a fresh deep-link position`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 })
  let failChunk: (() => Promise<void>) | undefined
  await page.route('**/assets/portfolio-*.js', route => { failChunk = () => route.abort() })
  await page.goto('/#tapasztalat', { waitUntil: 'load' })
  // Exercise browsers/settings without native scroll anchoring as well.
  await page.addStyleTag({ content: 'html, body { overflow-anchor: none !important; }' })
  const offset = () => page.locator('#tapasztalat').evaluate(e => e.getBoundingClientRect().top)
  await expect.poll(() => Boolean(failChunk)).toBe(true)
  await expect.poll(async () => Math.abs(await offset() - 64)).toBeLessThanOrEqual(2)
  await page.waitForTimeout(800)
  await failChunk!()
  await expect(page.locator('[data-motion-story]')).toBeHidden()
  await expect.poll(async () => Math.abs(await offset() - 64)).toBeLessThanOrEqual(2)
  await page.waitForTimeout(700)
  expect(Math.abs(await offset() - 64)).toBeLessThanOrEqual(2)
  expect(new URL(page.url()).hash).toBe('#tapasztalat')
})

test('4x CPU: full cinema scrub has no long tasks over 50ms in three fresh pages', async ({ browser }) => {
  // Three throttled browser contexts plus trace teardown can exceed the default
  // 30s on shared CI runners. The measured 50ms task budget remains unchanged.
  test.setTimeout(60_000)
  for (let run = 0; run < 3; run++) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
    const page = await context.newPage(), cdp = await context.newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    await ready(page)
    await pose(page, 0)
    await page.evaluate(() => {
      Object.assign(window, { cinemaTasks: [] })
      new PerformanceObserver(list => (window as unknown as { cinemaTasks: number[] }).cinemaTasks.push(...list.getEntries().map(e => e.duration))).observe({ type: 'longtask' })
    })
    for (let i = 0; i < 30; i++) {
      await page.evaluate(() => scrollBy({ top: 60, behavior: 'instant' }))
      await page.waitForTimeout(35)
    }
    const tasks = await page.evaluate(() => (window as unknown as { cinemaTasks: number[] }).cinemaTasks)
    expect(tasks.every(t => t <= 50), JSON.stringify(tasks)).toBe(true)
    await context.close()
  }
})

test('touch swipe drives the scene; landscape resize keeps the caption and skip link visible', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  const page = await context.newPage()
  await ready(page)
  await pose(page, .1)
  const cdp = await context.newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 200, y: 650 }] })
  for (let i = 1; i <= 8; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 200, y: 650 - i * 35 }] })
    await page.waitForTimeout(20)
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect.poll(async () => Number(await page.locator('[data-motion-story]').getAttribute('data-progress'))).toBeGreaterThan(.15)
  await page.setViewportSize({ width: 844, height: 390 })
  await pose(page, .5)
  const caption = (await page.locator('.cs-caption[data-active="true"]').boundingBox())!
  const link = (await page.locator('.cs-skip').boundingBox())!
  expect(caption.y).toBeGreaterThanOrEqual(64)
  expect(link.y + link.height).toBeLessThanOrEqual(390)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'tmp/cinema-evidence/landscape.png' })
  await context.close()
})

test('all story chapters retain accessible text and link contrast', async ({ page }) => {
  await ready(page)
  for (const p of [.15, .5, .85]) {
    await pose(page, p)
    const results = await new AxeBuilder({ page }).include('[data-motion-story]').analyze()
    expect(results.violations).toEqual([])
  }
})
