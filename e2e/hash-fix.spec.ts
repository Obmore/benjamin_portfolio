import fs from 'node:fs'
import { inflateSync } from 'node:zlib'
import { expect, test, type Page } from '@playwright/test'

type Rgb = [number, number, number]

function parseCssRgb(value: string): Rgb {
  const trim = value.trim()
  if (trim.startsWith('#')) {
    const body =
      trim.length === 4
        ? [...trim.slice(1)].map((ch) => ch + ch).join('')
        : trim.slice(1)
    const n = Number.parseInt(body, 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  const match = trim.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!match) throw new Error(`unparsed color ${value}`)
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

function rgbClose(a: Rgb, b: Rgb, tol = 12) {
  return Math.abs(a[0] - b[0]) <= tol && Math.abs(a[1] - b[1]) <= tol && Math.abs(a[2] - b[2]) <= tol
}

function paeth(a: number, b: number, c: number) {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) return a
  if (pb <= pc) return b
  return c
}

function decodePngRgba(png: Buffer) {
  if (png.subarray(1, 4).toString('ascii') !== 'PNG') throw new Error('not png')
  let offset = 8
  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = 0
  const chunks: Buffer[] = []
  while (offset + 8 <= png.length) {
    const length = png.readUInt32BE(offset)
    const type = png.toString('ascii', offset + 4, offset + 8)
    const data = png.subarray(offset + 8, offset + 8 + length)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      bitDepth = data[8]
      colorType = data[9]
      if (data[12] !== 0) throw new Error('interlaced png')
    } else if (type === 'IDAT') {
      chunks.push(Buffer.from(data))
    } else if (type === 'IEND') {
      break
    }
    offset += 12 + length
  }
  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
    throw new Error(`unsupported png ${bitDepth}/${colorType}`)
  }
  const bpp = colorType === 6 ? 4 : 3
  const stride = width * bpp
  const inflated = inflateSync(Buffer.concat(chunks))
  const pixels = Buffer.alloc(width * height * 4)
  let src = 0
  let prev = Buffer.alloc(stride)
  for (let y = 0; y < height; y += 1) {
    const filter = inflated[src]
    src += 1
    const row = Buffer.alloc(stride)
    const raw = inflated.subarray(src, src + stride)
    src += stride
    for (let i = 0; i < stride; i += 1) {
      const left = i >= bpp ? row[i - bpp] : 0
      const up = prev[i]
      const upLeft = i >= bpp ? prev[i - bpp] : 0
      const x = raw[i]
      if (filter === 0) row[i] = x
      else if (filter === 1) row[i] = (x + left) & 255
      else if (filter === 2) row[i] = (x + up) & 255
      else if (filter === 3) row[i] = (x + ((left + up) >> 1)) & 255
      else if (filter === 4) row[i] = (x + paeth(left, up, upLeft)) & 255
      else throw new Error(`png filter ${filter}`)
    }
    for (let x = 0; x < width; x += 1) {
      const o = (y * width + x) * 4
      const i = x * bpp
      pixels[o] = row[i]
      pixels[o + 1] = row[i + 1]
      pixels[o + 2] = row[i + 2]
      pixels[o + 3] = bpp === 4 ? row[i + 3] : 255
    }
    prev = row
  }
  return { width, height, data: pixels }
}

function countAccentOnRow(
  image: { width: number; data: Buffer },
  row: number,
  accent: Rgb,
) {
  if (row < 0 || row >= image.data.length / (image.width * 4)) return 0
  let count = 0
  for (let x = 0; x < image.width; x += 1) {
    const i = (row * image.width + x) * 4
    if (rgbClose([image.data[i], image.data[i + 1], image.data[i + 2]], accent)) count += 1
  }
  return count
}

async function installClsProbe(page: Page) {
  await page.evaluate(() => {
    const state = { value: 0 }
    ;(window as unknown as { __skipBarCls: { value: number } }).__skipBarCls = state
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & { hadRecentInput?: boolean; value: number }
        if (!shift.hadRecentInput) state.value += shift.value
      }
    }).observe({ type: 'layout-shift', buffered: true })
  })
}

async function headerBottomBand(page: Page, accent: Rgb) {
  const header = await page.evaluate(() => {
    const el = document.querySelector('header.site-header')
    if (!(el instanceof HTMLElement)) return null
    const rect = el.getBoundingClientRect()
    return {
      top: rect.top,
      bottom: rect.bottom,
      height: rect.height,
      headerH: getComputedStyle(document.documentElement).getPropertyValue('--header-h'),
      vw: window.innerWidth,
      dpr: window.devicePixelRatio,
    }
  })
  expect(header, 'site-header').toBeTruthy()
  const png = await page.screenshot({ type: 'png', animations: 'disabled' })
  const image = decodePngRgba(png)
  const viewport = page.viewportSize()
  expect(viewport).toBeTruthy()
  const scaleY = image.height / viewport!.height
  const yCss = header!.bottom
  const rows: number[] = []
  for (let d = -2; d <= 2; d += 1) {
    rows.push(Math.round((yCss + d) * scaleY))
  }
  const uniqueRows = [...new Set(rows.filter((row) => row >= 0 && row < image.height))]
  const counts = uniqueRows.map((row) => countAccentOnRow(image, row, accent))
  const best = Math.max(0, ...counts)
  return { header: header!, image, best, counts, uniqueRows, yCss }
}

async function assertAccentBarVisible(page: Page, label: string) {
  const styles = await page.locator('main').evaluate((el) => {
    const bar = getComputedStyle(el, '::before')
    const header = document.querySelector('header.site-header')
    return {
      focusVisible: el.matches(':focus-visible'),
      content: bar.content,
      position: bar.position,
      top: bar.top,
      height: bar.height,
      zIndex: bar.zIndex,
      pointerEvents: bar.pointerEvents,
      backgroundColor: bar.backgroundColor,
      transitionDuration: bar.transitionDuration,
      transitionProperty: bar.transitionProperty,
      willChange: bar.willChange,
      headerH: getComputedStyle(document.documentElement).getPropertyValue('--header-h'),
      headerHeight: header instanceof HTMLElement ? header.getBoundingClientRect().height : 0,
      headerBottom: header instanceof HTMLElement ? header.getBoundingClientRect().bottom : 0,
    }
  })
  expect(styles.focusVisible, `${label} :focus-visible`).toBe(true)
  expect(styles.position, `${label} position`).toBe('fixed')
  expect(parseFloat(styles.height), `${label} height`).toBe(2)
  expect(Number(styles.zIndex), `${label} z-index`).toBeGreaterThan(50)
  expect(styles.pointerEvents, `${label} pointer-events`).toBe('none')
  expect(
    styles.willChange === 'auto' || styles.willChange === 'none' || styles.willChange === '',
    `${label} will-change ${styles.willChange}`,
  ).toBe(true)
  const durations = styles.transitionDuration.split(',').map((part) => part.trim())
  expect(
    durations.every((part) => part === '0s' || part === '0ms'),
    `${label} transition-duration ${styles.transitionDuration}`,
  ).toBe(true)
  const headerH = parseFloat(styles.headerH)
  expect(headerH, `${label} --header-h`).toBe(64)
  expect(styles.headerHeight, `${label} header height`).toBe(headerH)
  expect(parseFloat(styles.top), `${label} bar top`).toBe(headerH)
  expect(Math.abs(styles.headerBottom - headerH), `${label} header bottom`).toBeLessThanOrEqual(0.5)

  const accent = parseCssRgb(styles.backgroundColor)
  const band = await headerBottomBand(page, accent)
  expect(band.best, `${label} accent pixels at header bottom±2 (${band.counts.join(',')})`).toBeGreaterThanOrEqual(
    Math.ceil(0.9 * band.image.width),
  )
}

async function assertNoAccentAtHeaderBottom(page: Page, label: string) {
  const accent = parseCssRgb(
    await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--color-accent'),
    ),
  )
  const band = await headerBottomBand(page, accent)
  expect(Math.max(0, ...band.counts), `${label} no accent at header bottom±2 (${band.counts.join(',')})`).toBe(0)
}

async function mainRect(page: Page) {
  return page.locator('main').evaluate((el) => {
    const rect = el.getBoundingClientRect()
    return { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
  })
}

async function focusMainViaSkip(page: Page) {
  await page.evaluate(() => {
    const root = document.documentElement
    root.tabIndex = -1
    root.focus({ preventScroll: true })
    root.removeAttribute('tabindex')
  })
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Ugrás a tartalomra' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('main')).toBeFocused()
}

const ARTIFACTS = '/opt/cursor/artifacts'
const VIEWPORTS = [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
] as const

const NAV_FIVE = [
  { name: 'Munkáim', id: 'munkaim' },
  { name: 'Rólam', id: 'rolam' },
  { name: 'Tapasztalat', id: 'tapasztalat' },
  { name: 'Kompetenciák', id: 'kompetenciak' },
  { name: 'Önéletrajz', id: 'oneletrajz' },
] as const

function collectConsoleErrors(page: Page) {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (error) => {
    errors.push(error.message)
  })
  return errors
}

async function gotoHome(page: Page, path = '/') {
  const response = await page.goto(path, { waitUntil: 'networkidle' })
  if (response) expect(response.status()).toBe(200)
  await page.evaluate(() => document.fonts.ready)
}

async function sectionDelta(page: Page, id: string) {
  return page.evaluate((sectionId) => {
    const el = document.getElementById(sectionId)
    if (!el) return 9999
    const offset = Number.parseFloat(getComputedStyle(el).scrollMarginTop) || 0
    return el.getBoundingClientRect().top - offset
  }, id)
}

async function waitAligned(page: Page, id: string, timeout = 8_000) {
  await page.waitForFunction(
    (sectionId) => {
      const el = document.getElementById(sectionId)
      if (!el) return false
      const offset = Number.parseFloat(getComputedStyle(el).scrollMarginTop) || 0
      return Math.abs(el.getBoundingClientRect().top - offset) <= 2
    },
    id,
    { timeout },
  )
}

async function clickDesktopNav(page: Page, name: string) {
  await page
    .getByRole('navigation', { name: 'Fő navigáció' })
    .getByRole('button', { name, exact: true })
    .click()
}

async function clickMobileNav(page: Page, name: string) {
  await page.getByRole('button', { name: 'Menü megnyitása' }).click()
  const mobile = page.getByRole('navigation', { name: 'Mobil navigáció' })
  await expect(mobile).toBeVisible()
  await mobile.getByRole('button', { name, exact: true }).click()
}

async function assertNoHorizontalScroll(page: Page, label: string) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement
    return { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth }
  })
  expect(
    overflow.scrollWidth,
    `horizontal scroll ${label}`,
  ).toBeLessThanOrEqual(overflow.clientWidth + 1)
}

async function assertNoJunkHrefs(page: Page) {
  const hrefs = await page.evaluate(() =>
    [...document.querySelectorAll('a[href]')].map((el) => el.getAttribute('href') ?? ''),
  )
  expect(hrefs.filter((href) => href === '#' || href === '#root' || href === '#top')).toEqual([])
}

async function waitLangSettled(page: Page, lang: 'en' | 'hu') {
  await page.waitForFunction(
    (expected) => {
      const root = document.documentElement
      const main = document.querySelector('main')
      if (root.lang !== expected) return false
      if (root.classList.contains('is-lang-vt')) return false
      if (main?.classList.contains('is-lang-out')) return false
      if (main?.classList.contains('is-lang-hold')) return false
      if (main?.classList.contains('is-lang-in')) return false
      return true
    },
    lang,
  )
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      }),
  )
}

test.describe('hash-fix PR7', () => {
  test('SeoHead hydrate keeps html.js, light-only theme despite saved dark, and below-fold reveal', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await page.addInitScript(() => {
      localStorage.setItem('theme', 'dark')
    })
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoHome(page)

    await expect(page.locator('html')).toHaveClass(/\bjs\b/)
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark')
    await expect(page.locator('html')).toHaveAttribute('lang', 'hu')

    const heroOpacity = await page.evaluate(() => {
      const name = document.querySelector('.hero-name')
      return name ? getComputedStyle(name).opacity : 'missing'
    })
    expect(Number(heroOpacity), `hero opacity ${heroOpacity}`).toBeGreaterThan(0)

    const hidden = page.locator('#oneletrajz [data-reveal]').first()
    await expect(hidden).toHaveCount(1)
    const hiddenOpacity = await hidden.evaluate((el) => getComputedStyle(el).opacity)
    expect(Number(hiddenOpacity), `below-fold opacity ${hiddenOpacity}`).toBe(0)
    expect(await hidden.getAttribute('data-revealed')).toBeNull()

    await hidden.scrollIntoViewIfNeeded()
    await expect(hidden).toHaveAttribute('data-revealed', 'true')
    await expect
      .poll(async () => hidden.evaluate((el) => getComputedStyle(el).opacity))
      .toBe('1')

    await page.reload({ waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    await expect(page.locator('html')).toHaveClass(/\bjs\b/)
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark')
    expect(errors, errors.join('\n')).toEqual([])
  })

  test('saved EN locale reloads with lang=en', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('portfolio-locale', 'en')
    })
    await gotoHome(page)
    await page.waitForFunction(() => document.documentElement.lang === 'en')
    await expect(
      page.getByRole('link', { name: 'OB. – Ott Benjámin, back to top' }),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'OB. – Ott Benjámin, back to top' }),
    ).toHaveText('OB.')
    await expect(page.getByRole('link', { name: 'Skip to content' })).toHaveCount(1)
  })

  test('skip link is first Tab, focuses main, leaves no hash', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoHome(page)

    const mainRectBefore = await page.locator('main').evaluate((el) => {
      const rect = el.getBoundingClientRect()
      return { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
    })

    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Ugrás a tartalomra' })
    await expect(skip).toBeFocused()
    await expect(skip).toHaveAttribute('href', '#main')
    const skipBox = await skip.boundingBox()
    expect(skipBox?.height ?? 0).toBeGreaterThanOrEqual(44)

    await page.keyboard.press('Enter')
    await expect(page.locator('main')).toBeFocused()
    const focused = await page.locator('main').evaluate((el) => {
      const rect = el.getBoundingClientRect()
      const bar = getComputedStyle(el, '::before')
      return {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        focusVisible: el.matches(':focus-visible'),
        barHeight: bar.height,
        barColor: bar.backgroundColor,
        barPosition: bar.position,
        barTop: bar.top,
        barZ: bar.zIndex,
        pointerEvents: bar.pointerEvents,
        willChange: bar.willChange,
        transitionDuration: bar.transitionDuration,
      }
    })
    expect(focused.focusVisible).toBe(true)
    expect(parseFloat(focused.barHeight)).toBe(2)
    expect(focused.barPosition).toBe('fixed')
    expect(parseFloat(focused.barTop)).toBe(64)
    expect(Number(focused.barZ)).toBeGreaterThan(50)
    expect(focused.pointerEvents).toBe('none')
    expect(focused.willChange === 'auto' || focused.willChange === 'none' || focused.willChange === '').toBe(
      true,
    )
    expect(focused.transitionDuration.split(',').every((part) => part.trim() === '0s' || part.trim() === '0ms')).toBe(
      true,
    )
    expect(focused.barColor).not.toBe('rgba(0, 0, 0, 0)')
    expect(focused.barColor).not.toBe('transparent')
    expect(focused.top).toBe(mainRectBefore.top)
    expect(focused.left).toBe(mainRectBefore.left)
    expect(focused.width).toBe(mainRectBefore.width)
    expect(focused.height).toBe(mainRectBefore.height)
    expect(await page.evaluate(() => location.hash)).toBe('')
    expect(page.url()).not.toContain('#')
    expect(errors, errors.join('\n')).toEqual([])
  })

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ] as const) {
    test(`${viewport.width}: skip-focus bar pixels at header bottom, both system preferences`, async ({
      page,
    }) => {
      test.setTimeout(60_000)
      await page.setViewportSize(viewport)
      await gotoHome(page)
      await installClsProbe(page)

      for (const theme of ['light', 'dark'] as const) {
        await page.emulateMedia({ colorScheme: theme })

        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
        await assertNoAccentAtHeaderBottom(page, `${viewport.width} ${theme} idle`)

        await page.locator('main').click({ position: { x: 12, y: 80 } })
        await expect(page.locator('main')).toBeFocused()
        expect(
          await page.locator('main').evaluate((el) => el.matches(':focus-visible')),
          `${viewport.width} ${theme} mouse focus is not :focus-visible`,
        ).toBe(false)
        await assertNoAccentAtHeaderBottom(page, `${viewport.width} ${theme} mouse`)

        const rectBefore = await mainRect(page)
        await focusMainViaSkip(page)
        const rectAfter = await mainRect(page)
        expect(rectAfter, `${viewport.width} ${theme} main rect`).toEqual(rectBefore)
        await assertAccentBarVisible(page, `${viewport.width} ${theme} top`)

        await page.getByRole('link', { name: /OB\./ }).click()
        await page.waitForFunction(() => !document.querySelector('main')?.matches(':focus-visible'))
        await assertNoAccentAtHeaderBottom(page, `${viewport.width} ${theme} after mouse click`)

        await focusMainViaSkip(page)
        await page.evaluate(() => window.scrollTo({ top: 520, behavior: 'instant' }))
        const scrolledBefore = await mainRect(page)
        await expect(page.locator('main')).toBeFocused()
        const scrolledAfter = await mainRect(page)
        expect(scrolledAfter, `${viewport.width} ${theme} scrolled main rect`).toEqual(scrolledBefore)
        await assertAccentBarVisible(page, `${viewport.width} ${theme} scrolled`)

        await page.evaluate(() => {
          window.scrollTo({ top: 0, behavior: 'instant' })
          const active = document.activeElement
          if (active instanceof HTMLElement) active.blur()
        })
      }

      if (viewport.width === 390) {
        await focusMainViaSkip(page)
        await expect(page.locator('main')).toHaveCSS('outline-style', 'none')
        await page.evaluate(() => {
          document.querySelector('.mobile-nav')?.classList.add('is-open')
        })
        await expect(page.locator('main')).toBeFocused()
        await page.waitForFunction(() => document.querySelector('main')?.matches(':focus-visible'))
        await assertNoAccentAtHeaderBottom(page, `${viewport.width} menu open while focused`)

        await page.evaluate(() => {
          document.querySelector('.mobile-nav')?.classList.remove('is-open')
          const active = document.activeElement
          if (active instanceof HTMLElement) active.blur()
        })
        await page.getByRole('button', { name: 'Menü megnyitása' }).click()
        await expect(page.getByRole('navigation', { name: 'Mobil navigáció' })).toBeVisible()
        await assertNoAccentAtHeaderBottom(page, `${viewport.width} menu open after click`)
      }

      const cls = await page.evaluate(
        () => (window as unknown as { __skipBarCls: { value: number } }).__skipBarCls.value,
      )
      expect(cls, `${viewport.width} CLS`).toBe(0)
    })
  }

  test('name link, junk hashes, work index replaceState, language switch', async ({
    page,
  }) => {
    const errors = collectConsoleErrors(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('about:blank')
    await gotoHome(page)

    const logo = page.getByRole('link', { name: 'OB. – Ott Benjámin, ugrás az oldal tetejére' })
    await expect(logo).toHaveAttribute('href', '/')
    await expect(logo).toHaveText('OB.')
    await expect(logo.locator('.text-accent')).toHaveText('.')
    const logoBox = await logo.boundingBox()
    expect(logoBox?.height ?? 0).toBeGreaterThanOrEqual(44)
    expect(logoBox?.width ?? 0).toBeGreaterThanOrEqual(44)
    const headerBox = await page.locator('header.site-header').boundingBox()
    expect(headerBox?.height ?? 0).toBe(64)
    await expect(page.locator('header [aria-current="true"]')).toHaveCount(0)
    await assertNoJunkHrefs(page)

    const startLength = await page.evaluate(() => history.length)

    for (const item of NAV_FIVE) {
      await clickDesktopNav(page, item.name)
      await waitAligned(page, item.id)
    }
    expect(await page.evaluate(() => history.length)).toBe(startLength)

    await clickDesktopNav(page, 'Kapcsolat')
    await waitAligned(page, 'kapcsolat')
    await logo.click()
    await page.waitForFunction(() => Math.abs(window.scrollY) < 2)
    expect(page.url()).not.toContain('#')
    expect(await page.evaluate(() => history.length)).toBe(startLength)
    await expect(page.locator('header [aria-current="true"]')).toHaveCount(0)

    await page.goBack()
    expect(page.url()).toBe('about:blank')

    await gotoHome(page, '/#root')
    await page.waitForFunction(() => location.hash === '')
    expect(page.url()).not.toContain('#root')
    await page.getByRole('button', { name: /^EN/ }).click()
    await page.waitForFunction(() => document.documentElement.lang === 'en')
    expect(await page.evaluate(() => location.hash)).toBe('')
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForFunction(() => location.hash === '')
    expect(page.url()).not.toContain('#root')
    await page.getByRole('button', { name: /^HU/ }).click()
    await page.waitForFunction(() => document.documentElement.lang === 'hu')

    await gotoHome(page, '/#')
    await page.waitForFunction(() => !location.href.includes('#'))
    expect(page.url()).not.toContain('#')

    await gotoHome(page)
    const afterHome = await page.evaluate(() => history.length)
    await page.locator('.work-index-link').first().click()
    await page.waitForFunction(() => location.hash.startsWith('#munka-'))
    expect(await page.evaluate(() => history.length)).toBe(afterHome)
    await clickDesktopNav(page, 'Önéletrajz')
    await waitAligned(page, 'oneletrajz')
    expect(await page.evaluate(() => location.hash)).toBe('#oneletrajz')

    await clickDesktopNav(page, 'Tapasztalat')
    await waitAligned(page, 'tapasztalat')
    const beforeLang = await sectionDelta(page, 'tapasztalat')
    expect(Math.abs(beforeLang)).toBeLessThanOrEqual(2)
    await page.getByRole('button', { name: /^EN/ }).click()
    await page.waitForFunction(() => document.documentElement.lang === 'en')
    await page.waitForTimeout(400)
    expect(Math.abs(await sectionDelta(page, 'tapasztalat'))).toBeLessThanOrEqual(2)
    expect(await page.evaluate(() => location.hash)).toBe('#tapasztalat')
    await page.getByRole('button', { name: /^HU/ }).click()
    await page.waitForFunction(() => document.documentElement.lang === 'hu')
    await page.waitForTimeout(400)
    expect(Math.abs(await sectionDelta(page, 'tapasztalat'))).toBeLessThanOrEqual(2)

    await gotoHome(page, '/#kapcsolat')
    await waitAligned(page, 'kapcsolat')
    await page.reload({ waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(700)
    // Owner follow-up: reload always returns to hero, even from a section hash.
    expect(await page.evaluate(() => scrollY)).toBe(0)
    expect(await page.evaluate(() => location.hash)).toBe('')

    expect(errors, errors.join('\n')).toEqual([])
  })

  for (const viewport of VIEWPORTS) {
    test(`${viewport.width}: console clean, no horizontal scroll, screenshots`, async ({
      page,
    }) => {
      const errors = collectConsoleErrors(page)
      await page.setViewportSize(viewport)
      await gotoHome(page)
      await assertNoHorizontalScroll(page, String(viewport.width))
      await expect(page.locator('html')).toHaveClass(/\bjs\b/)
      await expect(page.locator('html')).toHaveAttribute('lang', 'hu')

      const logo = page.getByRole('link', { name: 'OB. – Ott Benjámin, ugrás az oldal tetejére' })
      await expect(logo).toHaveText('OB.')
      const box = await logo.boundingBox()
      expect(box?.height ?? 0, `logo height ${viewport.width}`).toBeGreaterThanOrEqual(44)
      expect(box?.width ?? 0, `logo width ${viewport.width}`).toBeGreaterThanOrEqual(44)
      const headerBox = await page.locator('header.site-header').boundingBox()
      expect(headerBox?.height ?? 0, `header height ${viewport.width}`).toBe(64)

      if (viewport.width < 1024) {
        await clickMobileNav(page, 'Kapcsolat')
        await waitAligned(page, 'kapcsolat')
        await page.getByRole('button', { name: 'Menü megnyitása' }).click()
        await expect(page.getByRole('navigation', { name: 'Mobil navigáció' })).toBeVisible()
        await logo.click()
        await page.waitForFunction(() => Math.abs(window.scrollY) < 2)
        expect(page.url()).not.toContain('#')
        await expect(page.getByRole('navigation', { name: 'Mobil navigáció' })).toBeHidden()
      }

      fs.mkdirSync(ARTIFACTS, { recursive: true })
      await page.screenshot({
        path: `${ARTIFACTS}/hash-fix-${viewport.width}.png`,
        fullPage: false,
      })

      expect(errors, errors.join('\n')).toEqual([])
    })
  }

  test('desktop nav stays on one row at 1025–1280 with OB. logo', async ({ page }) => {
    for (const width of [1025, 1100, 1280] as const) {
      await page.setViewportSize({ width, height: 800 })
      await gotoHome(page)
      const headerBox = await page.locator('header.site-header').boundingBox()
      expect(headerBox?.height ?? 0, `header height ${width}`).toBe(64)
      const logo = page.getByRole('link', { name: 'OB. – Ott Benjámin, ugrás az oldal tetejére' })
      await expect(logo).toHaveText('OB.')
      const logoBox = await logo.boundingBox()
      expect(logoBox?.height ?? 0, `logo height ${width}`).toBeGreaterThanOrEqual(44)
      expect(logoBox?.width ?? 0, `logo width ${width}`).toBeGreaterThanOrEqual(44)

      const nav = page.getByRole('navigation', { name: 'Fő navigáció' })
      await expect(nav).toBeVisible()
      const buttons = nav.getByRole('button')
      await expect(buttons).toHaveCount(6)
      await expect(nav.locator('a[href="/megrendeles/"]')).toHaveCount(1)
      const items = nav.locator('button, a')
      await expect(items).toHaveCount(7)
      const tops = await items.evaluateAll((els) =>
        els.map((el) => el.getBoundingClientRect().top),
      )
      expect(Math.max(...tops) - Math.min(...tops), `nav wrap at ${width}: ${tops.join(',')}`).toBeLessThan(2)
      await assertNoHorizontalScroll(page, String(width))
    }
  })

  test('390 language switch at #tapasztalat stays ±2px', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await gotoHome(page)
    await clickMobileNav(page, 'Tapasztalat')
    await waitAligned(page, 'tapasztalat')
    await page.getByRole('button', { name: /^EN/ }).click()
    await page.waitForFunction(() => document.documentElement.lang === 'en')
    await page.waitForTimeout(400)
    expect(Math.abs(await sectionDelta(page, 'tapasztalat'))).toBeLessThanOrEqual(2)
    expect(await page.evaluate(() => location.hash)).toBe('#tapasztalat')
    await page.getByRole('button', { name: /^HU/ }).click()
    await page.waitForFunction(() => document.documentElement.lang === 'hu')
    await page.waitForTimeout(400)
    expect(Math.abs(await sectionDelta(page, 'tapasztalat'))).toBeLessThanOrEqual(2)
    expect(errors, errors.join('\n')).toEqual([])
  })

  test('360 language switch at #tapasztalat stays ±2px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 })
    await gotoHome(page)
    await clickMobileNav(page, 'Tapasztalat')
    await waitAligned(page, 'tapasztalat')
    await page.getByRole('button', { name: /^EN/ }).click()
    await page.waitForFunction(() => document.documentElement.lang === 'en')
    await page.waitForTimeout(400)
    expect(Math.abs(await sectionDelta(page, 'tapasztalat'))).toBeLessThanOrEqual(2)
  })

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ] as const) {
    test(`${viewport.width}: hash load reveals in-view instantly, below-fold still animates`, async ({
      page,
    }) => {
      await page.addInitScript(() => {
        const state = {
          firstWithReveal: null as null | {
            inView: boolean
            opacity: string
            transform: string
            revealed: string | null
          }[],
          instantTransitionRun: 0,
        }
        ;(window as unknown as { __hashReveal: typeof state }).__hashReveal = state
        document.addEventListener(
          'transitionrun',
          (event) => {
            const el = event.target
            if (!(el instanceof Element)) return
            if (
              el.hasAttribute('data-reveal') &&
              el.getAttribute('data-revealed') === 'instant'
            ) {
              state.instantTransitionRun += 1
            }
          },
          true,
        )
        const sample = () => {
          const els = document.querySelectorAll('[data-reveal]')
          if (els.length === 0 || state.firstWithReveal) {
            if (!state.firstWithReveal) requestAnimationFrame(sample)
            return
          }
          state.firstWithReveal = [...els].map((el) => {
            const rect = el.getBoundingClientRect()
            const cs = getComputedStyle(el)
            return {
              inView:
                rect.bottom > 0 &&
                rect.top < window.innerHeight &&
                rect.right > 0 &&
                rect.left < window.innerWidth,
              opacity: cs.opacity,
              transform: cs.transform,
              revealed: el.getAttribute('data-revealed'),
            }
          })
        }
        requestAnimationFrame(sample)
      })

      await page.setViewportSize(viewport)
      const hashes = ['oneletrajz', 'tapasztalat', 'kompetenciak'] as const
      for (const id of hashes) {
        await page.goto(`/?reveal=${viewport.width}-${id}#${id}`, {
          waitUntil: 'domcontentloaded',
        })
        await page.waitForFunction(
          () =>
            (window as unknown as { __hashReveal?: { firstWithReveal: unknown } })
              .__hashReveal?.firstWithReveal,
        )
        const probe = await page.evaluate(() => {
          const state = (
            window as unknown as {
              __hashReveal: {
                firstWithReveal: {
                  inView: boolean
                  opacity: string
                  transform: string
                  revealed: string | null
                }[]
                instantTransitionRun: number
              }
            }
          ).__hashReveal
          return state
        })
        const inView = probe.firstWithReveal.filter((item) => item.inView)
        expect(inView.length, `#${id} in-view reveals`).toBeGreaterThan(0)
        for (const item of inView) {
          expect(item.revealed, `#${id} data-revealed`).toBe('instant')
          expect(Number(item.opacity), `#${id} opacity ${item.opacity}`).toBe(1)
          expect(
            item.transform === 'none' || item.transform === 'matrix(1, 0, 0, 1, 0, 0)',
            `#${id} transform ${item.transform}`,
          ).toBe(true)
        }
        await page.waitForTimeout(1000)
        const later = await page.evaluate(
          () =>
            (window as unknown as { __hashReveal: { instantTransitionRun: number } })
              .__hashReveal.instantTransitionRun,
        )
        expect(later, `#${id} instant transitionrun`).toBe(0)

        const belowMoved = await page.evaluate(async () => {
          const below = [...document.querySelectorAll<HTMLElement>('[data-reveal]')].find(
            (el) => {
              const rect = el.getBoundingClientRect()
              const inView =
                rect.bottom > 0 &&
                rect.top < window.innerHeight &&
                rect.right > 0 &&
                rect.left < window.innerWidth
              return !inView && el.getAttribute('data-revealed') !== 'instant'
            },
          )
          if (!below) return { found: false, ran: false, opacity: '0' }
          let ran = false
          const onRun = (event: Event) => {
            if (event.target === below) ran = true
          }
          document.addEventListener('transitionrun', onRun, true)
          below.scrollIntoView({ block: 'center', behavior: 'instant' })
          await new Promise((resolve) => window.setTimeout(resolve, 700))
          document.removeEventListener('transitionrun', onRun, true)
          return {
            found: true,
            ran,
            opacity: getComputedStyle(below).opacity,
            revealed: below.getAttribute('data-revealed'),
          }
        })
        expect(belowMoved.found, `#${id} below-fold reveal`).toBe(true)
        expect(
          belowMoved.ran || belowMoved.revealed === 'true' || belowMoved.opacity === '1',
          `#${id} below-fold should animate`,
        ).toBe(true)

        await page.evaluate(() => {
          const state = (
            window as unknown as {
              __hashReveal: {
                firstWithReveal: unknown
                instantTransitionRun: number
              }
            }
          ).__hashReveal
          state.firstWithReveal = null
          state.instantTransitionRun = 0
        })
      }
    })

    test(`${viewport.width}: mid-section HU↔EN keeps viewport anchor ±2px`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport)
      await gotoHome(page)
      const sections = ['tapasztalat', 'kompetenciak'] as const

      for (const id of sections) {
        if (viewport.width < 1024) await clickMobileNav(page, id === 'tapasztalat' ? 'Tapasztalat' : 'Kompetenciák')
        else await clickDesktopNav(page, id === 'tapasztalat' ? 'Tapasztalat' : 'Kompetenciák')
        await waitAligned(page, id)
        await page.waitForTimeout(250)
        await page.evaluate(() => {
          window.scrollBy({ top: 280, behavior: 'instant' })
        })

        const before = await page.evaluate(() => {
          const x = Math.min(Math.max(24, window.innerWidth / 2), window.innerWidth - 24)
          let probe = document.elementFromPoint(x, 66)
          if (probe instanceof Element && probe.closest('header, .skip-link')) {
            probe = document.elementFromPoint(x, 76)
          }
          if (!(probe instanceof Element)) return null
          const section = probe.closest<HTMLElement>('main section[id]')
          if (!section) return null
          return {
            id: section.id,
            top: section.getBoundingClientRect().top,
            hash: location.hash,
            history: history.length,
          }
        })
        expect(before, `${id} viewport anchor`).toBeTruthy()
        expect(before!.id, `${id} section under viewport`).toBe(id)

        await page.getByRole('button', { name: /^EN/ }).click()
        await waitLangSettled(page, 'en')
        const afterEn = await page.evaluate((sectionId) => {
          const el = document.getElementById(sectionId)
          return {
            top: el ? el.getBoundingClientRect().top : 9999,
            hash: location.hash,
            history: history.length,
          }
        }, before!.id)
        expect(Math.abs(afterEn.top - before!.top), `${id} HU→EN ${viewport.width}`).toBeLessThanOrEqual(2)
        expect(afterEn.hash).toBe(before!.hash)
        expect(afterEn.history).toBe(before!.history)

        await page.getByRole('button', { name: /^HU/ }).click()
        await waitLangSettled(page, 'hu')
        const afterHu = await page.evaluate((sectionId) => {
          const el = document.getElementById(sectionId)
          return {
            top: el ? el.getBoundingClientRect().top : 9999,
            hash: location.hash,
            history: history.length,
          }
        }, before!.id)
        expect(Math.abs(afterHu.top - before!.top), `${id} EN→HU ${viewport.width}`).toBeLessThanOrEqual(2)
        expect(afterHu.hash).toBe(before!.hash)
        expect(afterHu.history).toBe(before!.history)
      }
    })

    test(`${viewport.width}: skip link contrast ≥4.5 under light and dark system preferences`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await gotoHome(page)

      const contrastOf = async () =>
        page.evaluate(() => {
          const el = document.querySelector('.skip-link')
          if (!(el instanceof HTMLElement)) return 0
          const cs = getComputedStyle(el)
          const parse = (value: string) => {
            const m = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
            if (!m) return [0, 0, 0]
            return [Number(m[1]), Number(m[2]), Number(m[3])]
          }
          const lum = (rgb: number[]) => {
            const lin = rgb.map((c) => {
              const s = c / 255
              return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
            })
            return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
          }
          const L1 = lum(parse(cs.color))
          const L2 = lum(parse(cs.backgroundColor))
          const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1]
          return (hi + 0.05) / (lo + 0.05)
        })

      expect(await contrastOf(), `light skip ${viewport.width}`).toBeGreaterThanOrEqual(4.5)

      await page.emulateMedia({ colorScheme: 'dark' })
      expect(await contrastOf(), `dark skip ${viewport.width}`).toBeGreaterThanOrEqual(4.5)
    })
  }

  for (const viewport of [
    { width: 1440, height: 1300 },
    { width: 390, height: 844 },
  ] as const) {
    test(`${viewport.width}x${viewport.height}: no-hash load keeps above-fold reveal animation`, async ({
      page,
    }) => {
      await page.addInitScript(() => {
        const state = { runs: 0, instantSeen: 0 }
        ;(window as unknown as { __noHashReveal: typeof state }).__noHashReveal = state
        document.addEventListener(
          'transitionrun',
          (event) => {
            const el = event.target
            if (!(el instanceof Element)) return
            const reveal = el.closest('[data-reveal]')
            if (!reveal) return
            if (reveal.getAttribute('data-revealed') === 'instant') {
              state.instantSeen += 1
              return
            }
            state.runs += 1
          },
          true,
        )
      })

      await page.setViewportSize(viewport)
      await page.goto(`/?fold=${viewport.width}x${viewport.height}`, {
        waitUntil: 'domcontentloaded',
      })
      await page.waitForSelector('[data-reveal]')
      await page.evaluate(() => document.fonts.ready)

      const snapshot = async () =>
        page.evaluate(() => {
          const nodes = [...document.querySelectorAll<HTMLElement>('[data-reveal]')]
          const inView = nodes.filter((el) => {
            const rect = el.getBoundingClientRect()
            return (
              rect.bottom > 0 &&
              rect.top < window.innerHeight &&
              rect.right > 0 &&
              rect.left < window.innerWidth
            )
          })
          const probe = (
            window as unknown as { __noHashReveal: { runs: number; instantSeen: number } }
          ).__noHashReveal
          return {
            instant: nodes.filter((el) => el.getAttribute('data-revealed') === 'instant').length,
            inView: inView.map((el) => ({
              revealed: el.getAttribute('data-revealed'),
              duration: getComputedStyle(el).transitionDuration,
            })),
            runs: probe.runs,
            instantSeen: probe.instantSeen,
          }
        })

      let seen = await snapshot()
      expect(seen.instant, `${viewport.width} instant marks`).toBe(0)
      expect(seen.instantSeen, `${viewport.width} instant transitionrun`).toBe(0)

      if (seen.inView.length === 0) {
        const animated = await page.evaluate(async () => {
          const firstReveal = document.querySelector<HTMLElement>('[data-reveal]')
          if (!firstReveal) return { found: false, ran: false, duration: '0s', revealed: null }
          let ran = false
          const onRun = (event: Event) => {
            const el = event.target
            if (!(el instanceof Element)) return
            if (el === firstReveal || firstReveal.contains(el)) ran = true
          }
          document.addEventListener('transitionrun', onRun, true)
          firstReveal.scrollIntoView({ block: 'center', behavior: 'instant' })
          await new Promise((resolve) => window.setTimeout(resolve, 700))
          document.removeEventListener('transitionrun', onRun, true)
          return {
            found: true,
            ran,
            duration: getComputedStyle(firstReveal).transitionDuration,
            revealed: firstReveal.getAttribute('data-revealed'),
            instant: document.querySelectorAll('[data-revealed="instant"]').length,
          }
        })
        expect(animated.found).toBe(true)
        expect(animated.instant).toBe(0)
        expect(
          animated.ran || animated.revealed === 'true',
          `${viewport.width} first reveal should animate`,
        ).toBe(true)
        expect(
          animated.duration.split(',').some((part) => Number.parseFloat(part) > 0.05),
          `${viewport.width} real transition ${animated.duration}`,
        ).toBe(true)
        return
      }

      for (const item of seen.inView) {
        expect(item.revealed, `${viewport.width} in-view data-revealed`).not.toBe('instant')
      }
      expect(
        seen.inView.some((item) =>
          item.duration.split(',').some((part) => Number.parseFloat(part) > 0.05),
        ),
        `${viewport.width} real transition duration`,
      ).toBe(true)

      const animated = await page.evaluate(async () => {
        const inView = [...document.querySelectorAll<HTMLElement>('[data-reveal]')].filter((el) => {
          const rect = el.getBoundingClientRect()
          return rect.bottom > 0 && rect.top < window.innerHeight
        })
        const target =
          inView.find((el) => el.getAttribute('data-revealed') !== 'true') ?? inView[0]
        if (!target) return { ran: false, revealed: null as string | null, runs: 0 }
        let ran = false
        const onRun = (event: Event) => {
          const el = event.target
          if (!(el instanceof Element)) return
          if (el === target || target.contains(el)) ran = true
        }
        document.addEventListener('transitionrun', onRun, true)
        if (target.getAttribute('data-revealed') !== 'true') {
          target.scrollIntoView({ block: 'center', behavior: 'instant' })
        }
        await new Promise((resolve) => window.setTimeout(resolve, 700))
        document.removeEventListener('transitionrun', onRun, true)
        const probe = (window as unknown as { __noHashReveal: { runs: number } }).__noHashReveal
        return {
          ran: ran || probe.runs > 0,
          revealed: target.getAttribute('data-revealed'),
          runs: probe.runs,
          instant: document.querySelectorAll('[data-revealed="instant"]').length,
        }
      })
      expect(animated.instant, `${viewport.width} instant after animate`).toBe(0)
      expect(
        animated.ran || animated.revealed === 'true',
        `${viewport.width} above-fold should animate`,
      ).toBe(true)
    })
  }
})

type HeroEntryProbe = {
  fcp: number | null
  heroAt: number | null
  titleFrames: number
  titleBad: number
  firstStart: number | null
  lastDone: number | null
  cls: number
  reduceFirst: null | {
    opacity: number
    transform: string
    animation: string
    transition: string
  }[]
}

function heroEntryInitScript() {
  const identity = (transform: string) =>
    transform === 'none' || transform === 'matrix(1, 0, 0, 1, 0, 0)'
  const zeroDuration = (value: string) =>
    value
      .split(',')
      .every((part) => Number.parseFloat(part.trim()) === 0 || part.trim() === '')
  const state = {
    fcp: null as number | null,
    heroAt: null as number | null,
    titleFrames: 0,
    titleBad: 0,
    firstStart: null as number | null,
    lastDone: null as number | null,
    cls: 0,
    reduceFirst: null as
      | {
          opacity: number
          transform: string
          animation: string
          transition: string
        }[]
      | null,
  }
  ;(window as unknown as { __heroEntry: typeof state }).__heroEntry = state

  const readFcp = () => {
    for (const entry of performance.getEntriesByType('paint')) {
      if (entry.name === 'first-contentful-paint') return entry.startTime
    }
    return null
  }
  const paintObs = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name === 'first-contentful-paint' && state.fcp == null) {
        state.fcp = entry.startTime
      }
    }
  })
  paintObs.observe({ type: 'paint', buffered: true })
  state.fcp = readFcp()

  const clsObs = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const shift = entry as PerformanceEntry & { hadRecentInput?: boolean; value: number }
      if (!shift.hadRecentInput) state.cls += shift.value
    }
  })
  clsObs.observe({ type: 'layout-shift', buffered: true })

  const entryStarts: (number | null)[] = []
  const entryDones: (number | null)[] = []

  const sampleReduce = () => {
    const nodes = [
      ...document.querySelectorAll('#hero h1, #hero .hero-name, #hero .hero-headline'),
      ...document.querySelectorAll('#hero .hero-sub, #hero .hero-btn, #hero .hero-chips, #hero .hero-titleblock-cell'),
    ]
    return nodes.map((el) => {
      const cs = getComputedStyle(el)
      return {
        opacity: Number(cs.opacity),
        transform: cs.transform,
        animation: cs.animationName,
        transition: cs.transitionDuration,
      }
    })
  }

  const tick = (now: number) => {
    if (state.fcp == null) state.fcp = readFcp()
    const h1 = document.querySelector('#hero h1')
    if (!h1) {
      requestAnimationFrame(tick)
      return
    }
    if (state.heroAt == null) state.heroAt = now

    const titleNodes = document.querySelectorAll('#hero h1, #hero h1 .hero-name, #hero h1 .hero-headline')
    for (const el of titleNodes) {
      const cs = getComputedStyle(el)
      state.titleFrames += 1
      const animOk = !cs.animationName || cs.animationName === 'none'
      const transOk = zeroDuration(cs.transitionDuration)
      if (Number(cs.opacity) !== 1 || !identity(cs.transform) || !animOk || !transOk) {
        state.titleBad += 1
      }
    }

    if (state.reduceFirst == null) state.reduceFirst = sampleReduce()

    const movers = [
      ...document.querySelectorAll('#hero .hero-sub'),
      ...document.querySelectorAll('#hero .hero-btn'),
      ...document.querySelectorAll('#hero .hero-chips'),
    ]
    movers.forEach((el, index) => {
      const cs = getComputedStyle(el)
      const opacity = Number(cs.opacity)
      if (entryStarts[index] == null && opacity > 0.02) entryStarts[index] = now
      if (entryDones[index] == null && opacity >= 0.995 && identity(cs.transform)) {
        entryDones[index] = now
      }
    })
    const starts = entryStarts.filter((value): value is number => value != null)
    const dones = entryDones.filter((value): value is number => value != null)
    state.firstStart = starts.length ? Math.min(...starts) : null
    state.lastDone =
      movers.length > 0 && dones.length === movers.length ? Math.max(...dones) : null

    const origin = state.fcp ?? state.heroAt
    if (origin != null && now < origin + 900) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

test.describe('hero entry timing', () => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ] as const) {
    test(`${viewport.width}: title static from first paint; entry ≤FCP+150 / ≤FCP+800; CLS 0`, async ({
      page,
    }) => {
      await page.addInitScript(heroEntryInitScript)
      await page.setViewportSize(viewport)
      await page.goto(`/?hero=${viewport.width}`, { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => {
        const state = (window as unknown as { __heroEntry?: HeroEntryProbe }).__heroEntry
        if (!state?.fcp || !state.heroAt || state.lastDone == null) return false
        return performance.now() >= state.fcp + 900
      })

      const probe = await page.evaluate(
        () => (window as unknown as { __heroEntry: HeroEntryProbe }).__heroEntry,
      )
      expect(probe.fcp, 'FCP').toBeTruthy()
      expect(probe.titleFrames, 'title frames').toBeGreaterThan(0)
      expect(probe.titleBad, 'title must stay opacity 1 / transform none / no animation').toBe(0)

      const first = (probe.firstStart ?? 9e9) - probe.fcp!
      const last = (probe.lastDone ?? 9e9) - probe.fcp!
      expect(first, `${viewport.width} first entry start ${first}ms after FCP`).toBeLessThanOrEqual(150)
      expect(last, `${viewport.width} last entry done ${last}ms after FCP`).toBeLessThanOrEqual(800)
      expect(probe.cls, `${viewport.width} CLS`).toBe(0)
    })

    test(`${viewport.width}: reduced-motion hero is static on the first frame`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.addInitScript(heroEntryInitScript)
      await page.setViewportSize(viewport)
      await page.goto(`/?hero-rm=${viewport.width}`, { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => {
        const state = (window as unknown as { __heroEntry?: HeroEntryProbe }).__heroEntry
        return Boolean(state?.reduceFirst && state.reduceFirst.length > 0)
      })

      const probe = await page.evaluate(
        () => (window as unknown as { __heroEntry: HeroEntryProbe }).__heroEntry,
      )
      expect(probe.reduceFirst?.length ?? 0, 'reduced-motion hero nodes').toBeGreaterThan(0)
      for (const item of probe.reduceFirst ?? []) {
        expect(item.opacity, `rm opacity ${item.opacity}`).toBe(1)
        expect(
          item.transform === 'none' || item.transform === 'matrix(1, 0, 0, 1, 0, 0)',
          `rm transform ${item.transform}`,
        ).toBe(true)
        expect(item.animation === 'none' || item.animation === '', `rm animation ${item.animation}`).toBe(
          true,
        )
        const durations = item.transition.split(',').map((part) => Number.parseFloat(part.trim()) || 0)
        expect(
          durations.every((ms) => ms === 0),
          `rm transition ${item.transition}`,
        ).toBe(true)
      }
      expect(probe.titleBad, 'rm title frames').toBe(0)
    })
  }
})

