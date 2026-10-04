import { expect, test, type Page } from '@playwright/test'

async function ready(page: Page) {
  await page.goto('/', { waitUntil: 'networkidle' })
  await expect(page.locator('html')).toHaveAttribute('data-spatial-motion', 'ready')
  await page.waitForTimeout(300)
}

for (const width of [1024, 1440]) test(`desktop ${width}: depth, pointer, scroll, stable layout`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 })
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(() => {
    Object.assign(window, { motionCls: 0 })
    new PerformanceObserver(list => {
      for (const e of list.getEntries() as (PerformanceEntry & { hadRecentInput: boolean; value: number })[]) {
        if (!e.hadRecentInput) (window as unknown as { motionCls: number }).motionCls += e.value
      }
    }).observe({ type: 'layout-shift', buffered: true })
  })
  await ready(page)
  await expect(page.locator('#hero .pm-scene')).toBeVisible()
  expect(await page.locator('#hero .pm-object').evaluate(e => getComputedStyle(e).transformStyle)).toBe('preserve-3d')
  const anchorTop = () => page.locator('#munkaim').evaluate(e => e.getBoundingClientRect().top + scrollY)
  const anchor = await anchorTop()
  const illustrationFits = () => page.locator('.hero-3d-poster-host').evaluate(host => {
    const frame = host.getBoundingClientRect()
    return [...host.querySelectorAll('.pm-plane,.pm-chip-top')].every(e => {
      const box = e.getBoundingClientRect()
      return box.left >= frame.left - 1 && box.right <= frame.right + 1 && box.top >= frame.top - 1 && box.bottom <= frame.bottom + 1
    })
  })
  const object = page.locator('#hero .pm-object'), board = page.locator('#hero .pm-board')
  const start = await object.getAttribute('style')
  await page.mouse.move(width - 120, 320)
  await expect.poll(() => object.getAttribute('style')).not.toBe(start)
  await page.waitForTimeout(250)
  expect(await illustrationFits()).toBe(true)
  await page.screenshot({ path: `test-results/motion-hero-${width}.png` })
  const depth = await board.getAttribute('style')
  await page.mouse.wheel(0, 280)
  await expect.poll(() => board.getAttribute('style')).not.toBe(depth)
  await page.waitForTimeout(300)
  expect(await illustrationFits()).toBe(true)
  await page.screenshot({ path: `test-results/motion-scroll-${width}.png` })
  expect(Math.abs(await anchorTop() - anchor)).toBeLessThanOrEqual(1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(await page.evaluate(() => (window as unknown as { motionCls: number }).motionCls)).toBe(0)
  expect(errors).toEqual([])
})

test('project screenshots tilt while their text and link layout remain still', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 }); await ready(page)
  await page.getByRole('button', { name: 'Munkáim', exact: true }).click()
  const frame = page.locator('.work-shot-frame').first()
  await frame.scrollIntoViewIfNeeded(); await page.waitForTimeout(500)
  const heading = page.locator('.work-card-title').first()
  const before = await heading.boundingBox()
  const transform = await frame.getAttribute('style')
  await frame.hover({ position: { x: 50, y: 30 } })
  await expect.poll(() => frame.getAttribute('style')).not.toBe(transform)
  expect(await heading.boundingBox()).toEqual(before)
  expect(await frame.getByRole('link').getAttribute('href')).toBe('https://anettesvendi.hu')
  await page.screenshot({ path: 'test-results/motion-project.png' })
})

for (const mode of ['reduce', 'low-memory', 'save-data'] as const) test(`${mode}: no optional download, original static illustration`, async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 900 },
    reducedMotion: mode === 'reduce' ? 'reduce' : 'no-preference', hasTouch: true })
  const page = await context.newPage(), requests: string[] = []
  if (mode === 'low-memory') await page.addInitScript(() => Object.defineProperty(navigator, 'deviceMemory', { value: 2 }))
  if (mode === 'save-data') await page.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true } }))
  page.on('request', request => requests.push(request.url()))
  await page.goto('/', { waitUntil: 'networkidle' }); await page.waitForTimeout(2000)
  await expect(page.locator('#hero .pm-scene')).toHaveCount(0)
  await expect(page.locator('.hero-3d-poster-host > svg')).toBeVisible()
  expect(requests.filter(url => /\/portfolio-.*\.(js|css)/.test(url))).toEqual([])
  if (mode === 'reduce') await page.screenshot({ path: 'test-results/motion-static-390.png' })
  await context.close()
})

test('live reduced-motion change restores poster and can resume without duplicates', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 }); await ready(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.locator('html')).toHaveAttribute('data-spatial-motion', 'paused')
  await expect(page.locator('#hero .pm-scene')).toBeHidden()
  await expect(page.locator('.hero-3d-poster-host > svg')).toBeVisible()
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect(page.locator('html')).toHaveAttribute('data-spatial-motion', 'ready')
  await expect(page.locator('#hero .pm-scene')).toHaveCount(1)
})

test('no animation-frame loop at rest or after pagehide; pageshow resumes', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.addInitScript(() => {
    const original = window.requestAnimationFrame
    Object.assign(window, { motionFrames: 0 })
    window.requestAnimationFrame = callback => original(time => {
      (window as unknown as { motionFrames: number }).motionFrames++
      callback(time)
    })
  })
  await ready(page)
  const frames = () => page.evaluate(() => (window as unknown as { motionFrames: number }).motionFrames)
  const idle = await frames(); await page.waitForTimeout(700); expect(await frames()).toBe(idle)
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })))
  const paused = await frames()
  await page.mouse.move(1000, 350); await page.waitForTimeout(250); expect(await frames()).toBe(paused)
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })))
  await expect.poll(frames).toBeGreaterThan(paused)
  await page.waitForTimeout(400)
  const restored = await frames(); await page.waitForTimeout(700); expect(await frames()).toBe(restored)
})

test('language switch preserves one animated illustration and original order content', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 }); await ready(page)
  await page.getByRole('button', { name: /EN.*váltás angolra/ }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator('#hero .pm-scene')).toHaveCount(1)
  await page.getByRole('link', { name: 'Order', exact: true }).first().click()
  await expect(page.locator('.mg-plan')).toHaveCount(6)
  await expect(page.locator('#hero .pm-scene')).toHaveCount(0)
})

test('4x CPU: optional startup tasks <=120ms and scroll tasks <=50ms, three fresh pages', async ({ browser }) => {
  for (let run = 0; run < 3; run++) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await context.newPage()
    const cdp = await context.newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    await page.addInitScript(() => {
      Object.assign(window, { motionTasks: [] })
      new PerformanceObserver(list => {
        (window as unknown as { motionTasks: { start: number; duration: number }[] }).motionTasks.push(...list.getEntries().map(e => ({ start: e.startTime, duration: e.duration })))
      }).observe({ type: 'longtask', buffered: true })
    })
    await ready(page)
    const startup = await page.evaluate(() => {
      const start = performance.getEntriesByType('resource').find(e => /\/portfolio-.*\.js/.test(e.name))!.startTime
      return (window as unknown as { motionTasks: { start: number; duration: number }[] }).motionTasks.filter(t => t.start >= start)
    })
    expect(startup.every(t => t.duration <= 120)).toBe(true)
    await page.evaluate(() => { (window as unknown as { motionTasks: unknown[] }).motionTasks = [] })
    for (let i = 0; i < 8; i++) { await page.mouse.wheel(0, 45); await page.waitForTimeout(60) }
    await page.waitForTimeout(350)
    const scroll = await page.evaluate(() => (window as unknown as { motionTasks: { duration: number }[] }).motionTasks)
    expect(scroll.every(t => t.duration <= 50)).toBe(true)
    await context.close()
  }
})
