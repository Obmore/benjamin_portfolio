import { test, expect } from '@playwright/test'

const ids = ['rendelolap', 'automatizalas', 'adatok', 'egyedi', 'bemutatkozo', 'uzemeltetes']
for (const width of [360, 390, 1024, 1440]) test(`${width}: spatial explanation, quick choice and readable draft`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 })
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto('/megrendeles/', { waitUntil: 'networkidle' })
  const choosePosition = () => page.locator('.mg-choose').evaluate(e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y + scrollY, w: r.width, h: r.height } })
  const before = await choosePosition()
  const positions = [[27, 27, -44], [50, 25, -70], [0, 0, 75]]
  for (let i = 0; i < 3; i++) {
    await page.locator('[data-flow-step]').nth(i).click()
    await expect(page.locator('[data-flow-step]').nth(i)).toHaveAttribute('aria-pressed', 'true')
    // Wait for the rendered pose, not a fixed delay or engine-specific matrix
    // string. WebKit can update composited transitions on a later frame.
    await expect.poll(() => page.locator('.mg-flow-result').evaluate(e => {
      const matrix = new DOMMatrix(getComputedStyle(e).transform)
      return [matrix.m41, matrix.m42, matrix.m43].map(Math.round)
    })).toEqual(positions[i])
    expect(await choosePosition()).toEqual(before)
  }
  await page.screenshot({ path: `tmp/inquiry-evidence/intro-${width}.png` })
  await page.locator('.mg-choose a').nth(2).click()
  await expect.poll(() => page.locator('#szolgaltatas-adatok').evaluate(e => Math.abs(e.getBoundingClientRect().top - 88))).toBeLessThanOrEqual(2)
  await page.locator('#szolgaltatas-adatok .mg-plan-cta').click()
  await expect(page.locator('#mg-service')).toHaveValue('adatok')
  await expect(page.locator('#mg-description')).toBeFocused()
  await page.waitForTimeout(850)
  await page.locator('#mg-description').fill('Mérési CSV-fájlokból szeretnék összesítő táblázatot és grafikont.')
  await page.waitForTimeout(750)
  const fields = await page.locator('#mg-service,#mg-description,#mg-write,#mg-copy,#mg-draft-copy').evaluateAll(es => es.map(e => {
    const r = e.getBoundingClientRect(); return { x: r.x, right: r.right, h: r.height, overflow: e.scrollWidth > e.clientWidth + 1 }
  }))
  for (const field of fields) {
    expect(field.x).toBeGreaterThanOrEqual(0)
    expect(field.right).toBeLessThanOrEqual(width)
    expect(field.h).toBeGreaterThanOrEqual(44)
    expect(field.overflow).toBe(false)
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(new URL(page.url()).hash).toBe('')
  expect(errors).toEqual([])
  await page.screenshot({ path: `tmp/inquiry-evidence/contact-${width}.png` })
})

test('all six packages preserve the description and correctly encode a local email draft', async ({ page }) => {
  const requests: string[] = []
  await page.goto('/megrendeles/', { waitUntil: 'networkidle' })
  page.on('request', request => requests.push(request.url()))
  const description = 'Ár & méret? 5 < 8; teszt@example.hu\nÚj sor #1 + emoji 🔧'
  await page.locator('#mg-description').fill(description)
  for (const id of ids) {
    await page.locator(`#szolgaltatas-${id} .mg-plan-cta`).click()
    await expect(page.locator('#mg-service')).toHaveValue(id)
    // Complete the visitor's smooth journey to the draft before auto-scrolling
    // back to a different card. Otherwise WebKit's old scroll can move the next
    // link between pointer-down and pointer-up.
    await expect.poll(() => page.locator('#kapcsolat-email').evaluate(e => {
      const top = e.getBoundingClientRect().top + scrollY - parseFloat(getComputedStyle(e).scrollMarginTop)
      return Math.abs(scrollY - Math.min(top, document.documentElement.scrollHeight - innerHeight))
    })).toBeLessThanOrEqual(2)
    await expect(page.locator('#mg-description')).toHaveValue(description)
    const url = new URL((await page.locator('#mg-write').getAttribute('href'))!)
    expect(url.protocol).toBe('mailto:')
    expect(url.pathname).toBe('bendzsiott1998@gmail.com')
    expect([...url.searchParams.keys()]).toEqual(['subject', 'body'])
    expect(url.searchParams.get('body')).toContain(description)
    expect(url.searchParams.get('body')).toContain(await page.locator(`#szolgaltatas-${id} h2`).innerText())
  }
  await page.locator('#mg-description').fill('')
  expect(new URL((await page.locator('#mg-write').getAttribute('href'))!).searchParams.get('body')).toContain('A kívánt eredmény:')
  await page.locator('#mg-description').fill('á'.repeat(1200))
  expect(new URL((await page.locator('#mg-write').getAttribute('href'))!).searchParams.get('body')).toContain('á'.repeat(1200))
  expect(requests).toEqual([])
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0])
})

test('copy draft succeeds visibly; denial provides selected manual-copy text', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { Object.assign(window, { copiedDraft: text }) } } }))
  await page.goto('/megrendeles/', { waitUntil: 'networkidle' })
  await page.locator('#mg-service').selectOption('egyedi')
  await page.locator('#mg-description').fill('Egy egyszerű belső nyilvántartást szeretnék.')
  await page.locator('#mg-draft-copy').click()
  await expect(page.locator('#mg-draft-copy')).toHaveText('Levélszöveg kimásolva')
  const expected = new URL((await page.locator('#mg-write').getAttribute('href'))!).searchParams.get('body')
  expect(await page.evaluate(() => (window as unknown as { copiedDraft: string }).copiedDraft)).toBe(expected)
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { throw new Error('denied') } } }))
  await page.locator('#mg-draft-copy').click()
  await expect(page.locator('#mg-draft-fallback')).toBeVisible()
  await expect(page.locator('#mg-draft-fallback')).toBeFocused()
  await expect(page.locator('#mg-draft-fallback')).toHaveValue(expected!)
  await expect(page.locator('#mg-status')).toContainText('nem sikerült')
})

test('reduced motion changes the diagram immediately and FAQ works with keyboard', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/megrendeles/')
  await page.locator('[data-flow-step="1"]').focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('.mg-flow')).toHaveAttribute('data-step', '1')
  expect(await page.locator('.mg-flow-sheet').first().evaluate(e => parseFloat(getComputedStyle(e).transitionDuration))).toBeLessThan(.001)
  await page.locator('.mg-faq summary').first().focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('.mg-faq details').first()).toHaveAttribute('open', '')
})

for (const width of [390, 1440]) test(`${width}: clean URL on ordinary browsing, shared links retain their destination`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 })
  await page.goto('/?source=preview', { waitUntil: 'networkidle' })
  await page.locator('.hero-actions a').first().click()
  await expect.poll(() => page.locator('#munkaim').evaluate(e => Math.abs(e.getBoundingClientRect().top - 64))).toBeLessThanOrEqual(2)
  await page.mouse.wheel(0, 350)
  await page.waitForTimeout(250)
  expect(new URL(page.url()).hash).toBe('')
  expect(new URL(page.url()).search).toBe('?source=preview')
  await page.locator('.work-index-link').last().click()
  await expect.poll(() => page.locator('.work-card').last().evaluate(e => Math.abs(e.getBoundingClientRect().top - 64))).toBeLessThanOrEqual(2)
  expect(new URL(page.url()).hash).toBe('')
  if (width === 390) {
    await page.locator('header button[aria-expanded]').click()
    await page.locator('.mobile-nav').getByRole('button', { name: 'Tapasztalat', exact: true }).click()
  } else await page.getByRole('button', { name: 'Tapasztalat', exact: true }).click()
  await expect.poll(() => page.locator('#tapasztalat').evaluate(e => Math.abs(e.getBoundingClientRect().top - 64))).toBeLessThanOrEqual(2)
  expect(new URL(page.url()).hash).toBe('')
  const href = (await page.locator('.work-index-link').last().getAttribute('href'))!
  await page.goto(href, { waitUntil: 'networkidle' })
  await expect.poll(() => page.locator('.work-card').last().evaluate(e => Math.abs(e.getBoundingClientRect().top - 64))).toBeLessThanOrEqual(2)
  expect(new URL(page.url()).hash).toBe(new URL(href, page.url()).hash)
  await page.reload({ waitUntil: 'networkidle' })
  expect(await page.evaluate(() => scrollY)).toBe(0)
})
