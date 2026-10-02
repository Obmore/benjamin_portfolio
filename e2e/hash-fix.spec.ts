import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

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
  test('SeoHead hydrate keeps html.js, dark theme, and below-fold reveal', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await page.addInitScript(() => {
      localStorage.setItem('theme', 'dark')
    })
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoHome(page)

    await expect(page.locator('html')).toHaveClass(/\bjs\b/)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
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
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
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
      }
    })
    expect(focused.focusVisible).toBe(true)
    expect(parseFloat(focused.barHeight)).toBe(2)
    expect(focused.barPosition).toBe('absolute')
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
    expect(Math.abs(await sectionDelta(page, 'kapcsolat'))).toBeLessThanOrEqual(2)
    expect(await page.evaluate(() => location.hash)).toBe('#kapcsolat')

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
      const tops = await buttons.evaluateAll((els) =>
        els.map((el) => Math.round(el.getBoundingClientRect().top)),
      )
      expect(new Set(tops).size, `nav wrap at ${width}: ${tops.join(',')}`).toBe(1)
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

    test(`${viewport.width}: skip link contrast ≥4.5 in light and dark`, async ({ page }) => {
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

      await page.getByRole('button', { name: 'Sötét mód' }).click()
      await page.waitForFunction(() => document.documentElement.getAttribute('data-theme') === 'dark')
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

