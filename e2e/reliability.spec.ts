import { test, expect } from '@playwright/test'

test('failed language download reports the error and an explicit retry recovers', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  let fail = true
  await page.route('**/assets/content.en-*.js', route => fail ? route.abort() : route.continue())
  await page.goto('/')
  const toggle = page.getByRole('button', { name: /EN.*váltás angolra/ })
  await toggle.click()
  await expect(page.getByRole('status').filter({ hasText: 'Az angol szöveg' })).toBeAttached()
  await expect(page.locator('html')).toHaveAttribute('lang', 'hu')
  fail = false
  await toggle.click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('button', { name: /HU.*switch to Hungarian/ })).toBeVisible()
  expect(errors).toEqual([])
})

test('unavailable stored English preference falls back to a correctly labelled Hungarian page', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('portfolio-locale', 'en'))
  await page.route('**/assets/content.en-*.js', route => route.abort())
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'hu')
  await expect(page.getByRole('button', { name: /EN.*váltás angolra/ })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('portfolio-locale'))).toBe('hu')
})

test('an old clipboard denial cannot replace a newer draft with stale text', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: () => new Promise((_, reject) => { Object.assign(window, { denyCopy: reject }) }) },
  }))
  await page.goto('/megrendeles/')
  await page.locator('#mg-description').fill('Régi szöveg')
  await page.locator('#mg-draft-copy').click()
  await page.locator('#mg-description').fill('Új szöveg')
  await page.evaluate(() => (window as unknown as { denyCopy: (e: Error) => void }).denyCopy(new Error('denied')))
  await expect(page.locator('#mg-draft-fallback')).toBeHidden()
  await expect(page.locator('#mg-description')).toHaveValue('Új szöveg')
  await expect(page.locator('#mg-status')).toBeEmpty()
})

test('order scroll animation resumes when motion is re-enabled, without overriding a manual choice', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/megrendeles/')
  await page.locator('.mg-flow').scrollIntoViewIfNeeded()
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect(page.locator('.mg-flow')).toHaveAttribute('data-follow', 'true')
  await page.locator('[data-flow-step="1"]').click()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect(page.locator('.mg-flow')).toHaveAttribute('data-follow', 'false')
  await expect(page.locator('.mg-flow')).toHaveAttribute('data-step', '1')
})

test('returning the scooter completes docking and locking before enabling the next action', async ({ page }) => {
  await page.goto('/#munka-hotel-rental', { waitUntil: 'networkidle' })
  await page.clock.install({ time: new Date('2026-10-05T10:00:00Z') })
  await page.clock.pauseAt(new Date('2026-10-05T10:00:01Z'))
  await page.locator('.rd-action').click()
  await page.clock.runFor(1800)
  await expect(page.locator('.rd-shell')).toHaveAttribute('data-stage', 'ride')
  await page.locator('.rd-action').click()
  await page.clock.runFor(950)
  await expect(page.locator('.rd-shell')).toHaveAttribute('data-stage', 'locking')
  await expect(page.locator('.rd-action')).toHaveAttribute('aria-disabled', 'true')
  await expect(page.locator('.rd-status')).toContainText('zár bezárul')
  await page.clock.runFor(400)
  await expect(page.locator('.rd-shell')).toHaveAttribute('data-stage', 'charge')
  await expect(page.locator('.rd-action')).toHaveAttribute('aria-disabled', 'false')
})
