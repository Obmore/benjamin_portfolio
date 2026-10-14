import { expect, type Page } from '@playwright/test'

// The Rollin host inherits a fractional document offset from all copy above it.
// Chromium paints the contained host on a whole pixel, while Playwright clips the
// unsnapped layout box, so a copy change elsewhere moved the artwork within the clip.
// Align the host to a whole CSS pixel before comparing its scene.
export async function alignRollinHost(page: Page) {
  const offset = await page.locator('[data-rollin-demo]').evaluate((host: HTMLElement) => {
    const top = () => host.getBoundingClientRect().top - document.documentElement.getBoundingClientRect().top
    const natural = top() - (parseFloat(host.style.top) || 0)
    // Relative offsets reach layout reads at once; margin and translate on this
    // contained host are only reflected after the next frame.
    host.style.position = 'relative'
    host.style.top = `${Math.ceil(natural) - natural}px`
    return top()
  })
  expect(Number.isInteger(offset), `Rollin host document offset ${offset}`).toBe(true)
}
