import { expect, test, type Page } from '@playwright/test'

const LOGO_NAME = /ugrás az oldal tetejére/
const inlineScrollBehavior = (page: Page) =>
  page.evaluate(() => document.documentElement.style.scrollBehavior)
const computedScrollBehavior = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)

test.describe('scroll behavior after the initial hash', () => {
  // The layout effect forces instant scrolling for the initial jump; whatever hash the
  // page opened with, the stylesheet's smooth scrolling has to be back afterwards.
  for (const hash of ['#', '#root', '#top', '#kapcsolat']) {
    test(`/${hash} restores the stylesheet scroll behavior`, async ({ page }) => {
      await page.goto(`/${hash}`, { waitUntil: 'networkidle' })
      await page.evaluate(() => document.fonts.ready)
      await expect.poll(() => inlineScrollBehavior(page)).toBe('')
      expect(await computedScrollBehavior(page)).toBe('smooth')
      if (hash === '#' || hash === '#root' || hash === '#top') {
        expect(await page.evaluate(() => location.href.includes('#'))).toBe(false)
      }
    })
  }
})

test.describe('logo link', () => {
  for (const modifier of ['ctrlKey', 'metaKey', 'shiftKey', 'altKey'] as const) {
    test(`${modifier} click is left to the browser`, async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' })
      const logo = page.getByRole('link', { name: LOGO_NAME })
      const prevented = await logo.evaluate((element, key) => {
        const event = new MouseEvent('click', { bubbles: true, cancelable: true, [key]: true })
        element.dispatchEvent(event)
        return event.defaultPrevented
      }, modifier)
      expect(prevented).toBe(false)
    })
  }

  test('a plain click still scrolls to the top and keeps the URL clean', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.evaluate(() => window.scrollTo({ top: 1500, behavior: 'instant' }))
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(1000)
    await page.getByRole('link', { name: LOGO_NAME }).click()
    await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(2)
    expect(await page.evaluate(() => location.pathname + location.hash)).toBe('/')
  })

  test('Ctrl+click opens the home page in a new tab without scrolling this one', async ({
    page,
    context,
  }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.evaluate(() => window.scrollTo({ top: 1500, behavior: 'instant' }))
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(1000)
    const scrolled = await page.evaluate(() => scrollY)
    const [popup] = await Promise.all([
      context.waitForEvent('page', { timeout: 5_000 }),
      page.getByRole('link', { name: LOGO_NAME }).click({ modifiers: ['Control'] }),
    ])
    await popup.waitForLoadState('domcontentloaded')
    expect(new URL(popup.url()).pathname).toBe('/')
    await popup.close()
    expect(await page.evaluate(() => scrollY)).toBe(scrolled)
  })
})
