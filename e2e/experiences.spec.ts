import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('failed optional experience bundle keeps the project, language switch and navigation usable', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  await page.route('**/assets/experiences-*.js', route => route.abort())
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.getByRole('link', { name: 'Nézze meg működés közben', exact: true }).click()
  await expect(page.locator('[data-rollin-demo] p')).toContainText('projektleírásban olvashat')
  await expect(page.locator('#munka-hotel-rental')).toContainText('A munkám')
  await page.getByRole('button', { name: /EN.*váltás angolra/ }).click()
  await expect(page.locator('#munka-hotel-rental')).toContainText('My contribution')
  await page.reload({ waitUntil: 'networkidle' })
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0)
  expect(errors).toEqual([])
})

for (const width of [360, 1024, 1440]) test(`${width}: the scooter stays inside its scene at both viewpoint limits`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#munka-hotel-rental', { waitUntil: 'networkidle' })
  for (const angle of ['-42', '-8']) {
    await page.getByRole('slider', { name: 'Nézőpont' }).fill(angle)
    for (let step = 0; step < 3; step++) {
      const bounds = await page.locator('.rd-scene').evaluate(e => {
        const scene = e.getBoundingClientRect(), vehicle = e.querySelector('.rd-vehicle')!.getBoundingClientRect()
        return [vehicle.left - scene.left, scene.right - vehicle.right, vehicle.top - scene.top, scene.bottom - vehicle.bottom]
      })
      for (const [i, margin] of bounds.entries()) expect(margin, `angle ${angle}, stage ${step}, edge ${i}`).toBeGreaterThanOrEqual(0)
      await page.locator('.rd-action').click()
    }
  }
})

for (const width of [390, 1440]) test(`${width}: Rollin unlock, return, charge, viewpoint and language preserve state`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 })
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.getByRole('link', { name: 'Nézze meg működés közben', exact: true }).click()
  const shell = page.locator('.rd-shell')
  await expect(shell).toHaveAttribute('data-stage', 'docked')
  await expect.poll(() => page.locator('#munka-hotel-rental').evaluate(e => Math.abs(e.getBoundingClientRect().top - 64))).toBeLessThanOrEqual(2)
  expect(new URL(page.url()).hash).toBe('')
  const top = () => page.locator('#rolam').evaluate(e => e.getBoundingClientRect().top + scrollY)
  const before = await top()
  await page.getByRole('button', { name: 'Nyitás', exact: true }).click()
  await expect(shell).toHaveAttribute('data-stage', 'ride')
  await expect(page.locator('.rd-status')).toContainText('bérlés folyamatban')
  const pose = await page.locator('.rd-world').getAttribute('style')
  await page.getByRole('slider', { name: 'Nézőpont' }).fill('-35')
  expect(await page.locator('.rd-world').getAttribute('style')).not.toBe(pose)
  await page.getByRole('button', { name: /EN.*váltás angolra/ }).click()
  await expect(shell).toHaveAttribute('data-stage', 'ride')
  await expect(page.getByRole('button', { name: 'Return vehicle', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Return vehicle', exact: true }).click()
  await expect(shell).toHaveAttribute('data-stage', 'charge')
  await expect(page.locator('.rd-status')).toContainText('starts charging')
  await page.getByRole('button', { name: /HU.*switch to Hungarian/ }).click()
  await expect(shell).toHaveAttribute('data-stage', 'charge')
  await expect(page.locator('.rd-status')).toContainText('töltés')
  await page.getByRole('button', { name: 'Újrapróbálom', exact: true }).click()
  await expect(shell).toHaveAttribute('data-stage', 'docked')
  expect(Math.abs(await top() - before)).toBeLessThanOrEqual(1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect((await new AxeBuilder({ page }).include('[data-rollin-demo]').analyze()).violations).toEqual([])
  expect(errors).toEqual([])
  await page.locator('[data-rollin-demo]').screenshot({ path: `test-results/rollin-${width}.png` })
})

test('Rollin keyboard controls and reduced motion settle immediately, including mid-animation preference changes', async ({ page }) => {
  await page.goto('/#munka-hotel-rental', { waitUntil: 'networkidle' })
  const button = page.locator('.rd-action'), shell = page.locator('.rd-shell')
  await button.focus(); await page.keyboard.press('Enter')
  await expect(button).toHaveAttribute('aria-disabled', 'true')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(shell).toHaveAttribute('data-stage', 'ride')
  await expect(button).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(shell).toHaveAttribute('data-stage', 'charge')
  expect(await page.locator('.rd-vehicle').evaluate(e => parseFloat(getComputedStyle(e).transitionDuration))).toBeLessThan(.001)
  await page.keyboard.press('Enter'); await expect(shell).toHaveAttribute('data-stage', 'docked')
})

test('Rollin settles a pending transition on pagehide and resumes with working controls', async ({ page }) => {
  await page.goto('/#munka-hotel-rental', { waitUntil: 'networkidle' })
  await page.locator('.rd-action').click()
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })))
  await expect(page.locator('.rd-shell')).toHaveAttribute('data-stage', 'ride')
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })))
  await page.locator('.rd-action').click()
  await expect(page.locator('.rd-shell')).toHaveAttribute('data-stage', 'charge')
})

for (const width of [390, 1440]) test(`${width}: real mobile previews load only on demand and keep text geometry`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 })
  const images: string[] = []
  page.on('request', r => { if (r.url().includes('-mobile.jpg')) images.push(r.url()) })
  await page.goto('/', { waitUntil: 'networkidle' })
  expect(images).toEqual([])
  for (const id of ['anettesvendi', 'lelkiter', 'lelek-es-nyelv']) {
    const card = page.locator(`#munka-${id}`), toggle = card.locator('.work-device-toggle')
    await card.scrollIntoViewIfNeeded()
    await toggle.scrollIntoViewIfNeeded(); await page.waitForTimeout(250)
    const geometry = () => card.evaluate(e => {
      const card = e.getBoundingClientRect(), title = e.querySelector('h3')!.getBoundingClientRect()
      return [title.x - card.x, title.y - card.y, title.width, title.height].map(n => Math.round(n * 100) / 100)
    })
    const before = await geometry()
    await toggle.click(); await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(() => card.locator('.work-phone img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
    expect(await geometry()).toEqual(before)
    await toggle.click(); await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  }
  expect(images).toHaveLength(3)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

for (const width of [390, 1440]) test(`${width}: order animation follows scroll and manual selection has priority`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 })
  await page.goto('/megrendeles/', { waitUntil: 'networkidle' })
  const flow = page.locator('.mg-flow'), sheet = page.locator('.mg-flow-result')
  await expect(flow).toHaveAttribute('data-follow', 'true')
  const start = await sheet.getAttribute('style')
  await flow.evaluate(e => { const top = e.getBoundingClientRect().top + scrollY; scrollTo({ top: Math.max(0, top - innerHeight * .45) + 170, behavior: 'instant' }) })
  await expect.poll(() => sheet.getAttribute('style')).not.toBe(start)
  await page.locator('[data-flow-step="1"]').click()
  await expect(flow).toHaveAttribute('data-follow', 'false')
  const selected = await sheet.getAttribute('style')
  await page.mouse.wheel(0, 90); await page.waitForTimeout(200)
  expect(await sheet.getAttribute('style')).toBe(selected)
  await expect(flow).toHaveAttribute('data-step', '1')
  await page.locator('.mg-flow-follow').click()
  await expect(flow).toHaveAttribute('data-follow', 'true')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(flow).toHaveAttribute('data-follow', 'false')
  await expect(page.locator('.mg-flow-follow')).toBeDisabled()
  await page.locator('[data-flow-step="2"]').click()
  await expect(flow).toHaveAttribute('data-step', '2')
})
