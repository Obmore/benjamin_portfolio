import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// Acceptance criteria for the customer-facing site (honlap-ugyfelre).
const EMAIL = 'ott.benjamin.ev@ottbenjamin.hu'
const SITE = 'https://ottbenjamin.hu'
const LIVE_PATHS = ['/', '/megrendeles/', '/impresszum/', '/en/imprint/', '/aszf/', '/adatkezeles/']
const STATIC_PAGES = ['/megrendeles/', '/impresszum/', '/en/imprint/', '/aszf/', '/adatkezeles/']
// Package letter on the home page -> card id on /megrendeles/.
const PACKAGE_CARDS = {
  A: 'szolgaltatas-rendelolap',
  B: 'szolgaltatas-automatizalas',
  C: 'szolgaltatas-adatok',
  D: 'szolgaltatas-egyedi',
  E: 'szolgaltatas-bemutatkozo',
  F: 'szolgaltatas-uzemeltetes',
} as const
const AMOUNT = /\d{1,3}(?:[  ]\d{3})*[  ]Ft/g
const VAT = 'AAM (áfamentes)'

const normalize = (text: string) => text.replace(/\s+/g, ' ').trim()
const amounts = (text: string) => [...normalize(text.replace(/ /g, ' ')).matchAll(AMOUNT)].map(m => m[0]).sort()
const count = (text: string, needle: string) => text.split(needle).length - 1

async function gotoHome(page: Page) {
  const response = await page.goto('/', { waitUntil: 'networkidle' })
  expect(response?.status()).toBe(200)
  await expect(page.locator('#csomagok')).toBeVisible()
}

async function switchToEnglish(page: Page) {
  await page.getByRole('button', { name: /EN.*váltás angolra/ }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
}

async function noHorizontalScroll(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)
}

test.describe('AC1 hero speaks to clients, HU and EN in pairs', () => {
  test('hero names the audience and offers packages and email', async ({ page }) => {
    await gotoHome(page)
    await expect(page.locator('#hero .hero-headline')).toContainText('kis- és középvállalkozás')
    const actions = page.locator('#hero .hero-actions > a')
    await expect(actions).toHaveCount(2)
    await expect(actions.nth(0)).toHaveText('Csomagok és árak')
    await expect(actions.nth(0)).toHaveAttribute('href', /#csomagok$/)
    await expect(actions.nth(1)).toHaveText('Keressen bátran')
    await expect(actions.nth(1)).toHaveAttribute('href', new RegExp(`^mailto:${EMAIL.replace(/\./g, '\\.')}`))
    await expect(page.locator('#hero')).toContainText(EMAIL)
    await expect(page.locator('#hero a[href="/megrendeles/"]')).toHaveCount(1)
    for (const target of ['lapszabász', 'bútor', 'UNAS', 'B2B']) await expect(page.locator('#hero')).toContainText(target)

    await actions.nth(0).click()
    await expect.poll(() => page.locator('#csomagok').evaluate(e => Math.abs(e.getBoundingClientRect().top - 64))).toBeLessThanOrEqual(2)

    await switchToEnglish(page)
    await expect(page.locator('#hero .hero-headline')).toContainText(/small and medium-sized businesses/i)
    await expect(actions.nth(0)).toHaveText('Packages and prices')
    await expect(actions.nth(1)).toHaveText('Get in touch')
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/open to (new )?opportunit|roles where|looking for (a )?(new )?(job|role|position)/i)
  })

  test('copy button copies the visible business address', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'clipboard permissions are Chromium-only')
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await gotoHome(page)
    await page.locator('#hero').getByRole('button', { name: 'Cím másolása' }).click()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(EMAIL)
  })

  test('the business address is readable without JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    expect((await page.goto('/'))?.status()).toBe(200)
    await expect(page.locator('body')).toContainText(EMAIL)
    await expect(page.locator(`a[href^="mailto:${EMAIL}"]`).first()).toBeVisible()
    await expect(page.locator('a[href="/megrendeles/"]').first()).toBeVisible()
    await context.close()
  })

  test('the fallback appears when the app module cannot load', async ({ page }) => {
    await page.route(/\/assets\/main-[^/]+\.js$/, route => route.abort())
    expect((await page.goto('/'))?.status()).toBe(200)
    await expect(page.locator('.nojs')).toBeHidden()
    await expect(page.locator('.nojs')).toBeVisible({ timeout: 8000 })
    await expect(page.locator('.nojs')).toContainText(EMAIL)
  })

  test('experience, skills and CV sit under About, not in the main navigation', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoHome(page)
    const nav = page.getByRole('navigation', { name: 'Fő navigáció' })
    await expect(nav.locator('button')).toHaveText(['Csomagok', 'Munkáim', 'Rólam', 'Kapcsolat'])
    await expect(nav.locator('a[href="/megrendeles/"]')).toHaveCount(1)
    const order = await page.evaluate(() => ['hero', 'csomagok', 'munkaim', 'rolam', 'tapasztalat', 'kompetenciak', 'oneletrajz', 'kapcsolat']
      .map(id => document.getElementById(id)!.getBoundingClientRect().top + scrollY))
    expect([...order].sort((a, b) => a - b)).toEqual(order)
    for (const id of ['tapasztalat', 'kompetenciak', 'oneletrajz']) await expect(page.locator(`#rolam a[href$="#${id}"]`)).toHaveCount(1)
    await expect(page.locator('#hero a[href$=".pdf"]')).toHaveCount(0)
    // The CV files are still offered, from the CV section under About.
    for (const file of ['Ott_Benjamin_CV_HU.pdf', 'Ott_Benjamin_CV_EN.pdf']) {
      await expect(page.locator(`#oneletrajz a[href="/cv/${file}"]`)).toHaveCount(1)
      expect((await page.request.get(`/cv/${file}`)).status(), file).toBe(200)
    }
  })
})

test.describe('AC2 packages: one price source for the home page and /megrendeles/', () => {
  test('six packages show the same amounts and VAT label on both pages', async ({ page }) => {
    await page.goto('/megrendeles/')
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0)
    const order: Record<string, { amounts: string[]; vat: number }> = {}
    for (const [letter, id] of Object.entries(PACKAGE_CARDS)) {
      const text = await page.locator(`#${id}`).innerText()
      order[letter] = { amounts: amounts(text), vat: count(text, VAT) }
      expect(order[letter].vat, `/megrendeles/ ${letter} VAT label per amount`).toBe(order[letter].amounts.length)
    }
    expect(Object.values(order).flatMap(card => card.amounts).length).toBeGreaterThanOrEqual(7)

    await gotoHome(page)
    await expect(page.locator('#csomagok [data-package]')).toHaveCount(6)
    for (const letter of Object.keys(PACKAGE_CARDS)) {
      const card = page.locator(`#csomagok [data-package="${letter}"]`)
      const text = await card.innerText()
      expect(amounts(text), `home ${letter} amounts`).toEqual(order[letter].amounts)
      expect(count(text, VAT), `home ${letter} VAT label per amount`).toBe(order[letter].amounts.length)
      await expect(card.locator(`a[href="/megrendeles/#${PACKAGE_CARDS[letter as keyof typeof PACKAGE_CARDS]}"]`)).toHaveCount(1)
    }
  })

  test('amounts are written once, in the pricing module', () => {
    const literal = /\b(?:149|189|129)(?:[  _]|&nbsp;)?000\b|\b(?:4|9)(?:[  _]|&nbsp;)?900\b/
    // Besides the known amounts, no typed "<digits> Ft" anywhere outside pricing.ts.
    const typedPrice = /\d(?:[\d  .]|&nbsp;)*(?:&nbsp;|[  ])?Ft\b/
    const pages = ['index.html', 'megrendeles/index.html', 'impresszum/index.html', 'en/imprint/index.html', 'aszf/index.html']
    const sources = fs.readdirSync('src', { recursive: true, encoding: 'utf8' })
      .filter(file => /\.(ts|tsx)$/.test(file) && path.basename(file) !== 'pricing.ts')
      .map(file => path.join('src', file))
    for (const file of [...pages, ...sources]) {
      const text = fs.readFileSync(file, 'utf8')
      expect(text, file).not.toMatch(literal)
      expect(text, file).not.toMatch(typedPrice)
    }
  })
})

test.describe('AC3 imprint pages', () => {
  const facts = ['Ott Benjámin', '8944 Sárhida, Kossuth utca 32.', '59492319', '90312599-1-40', EMAIL, 'GitHub, Inc.', 'Fastly, Inc.', 'Zala Vármegyei Kereskedelmi és Iparkamara']
  for (const [url, lang] of [['/impresszum/', 'hu'], ['/en/imprint/', 'en']] as const) test(`${url} lists the required data`, async ({ page }) => {
    expect((await page.goto(url))?.status()).toBe(200)
    await expect(page.locator('html')).toHaveAttribute('lang', lang)
    for (const fact of facts) await expect(page.locator('main')).toContainText(fact)
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  })
})

test.describe('AC4 terms draft', () => {
  test('/aszf/ is marked as a draft at the top and has no prices', async ({ page }) => {
    expect((await page.goto('/aszf/'))?.status()).toBe(200)
    const banner = page.locator('main').getByText('Tervezet – jogi ellenőrzés előtt')
    await expect(banner).toBeVisible()
    const firstText = await page.locator('main').evaluate(main => (main as HTMLElement).innerText.trim().split('\n')[0])
    expect(firstText).toContain('Tervezet – jogi ellenőrzés előtt')
    expect(amounts(await page.locator('main').innerText())).toEqual([])
    await expect(page.locator('main a[href="/megrendeles/"]').first()).toBeVisible()
    await expect(page.locator('main a[href="/adatkezeles/"]').first()).toBeVisible()
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  })
})

test.describe('AC3/AC4 footer links', () => {
  test('every page links the imprint and the terms from its footer', async ({ page }) => {
    await gotoHome(page)
    await expect(page.locator('footer a[href="/impresszum/"]')).toHaveCount(1)
    await expect(page.locator('footer a[href="/aszf/"]')).toHaveCount(1)
    await switchToEnglish(page)
    await expect(page.locator('footer a[href="/en/imprint/"]')).toHaveCount(1)
    await expect(page.locator('footer a[href="/aszf/"]')).toHaveCount(1)
    for (const url of STATIC_PAGES) {
      await page.goto(url)
      const imprint = url === '/en/imprint/' ? '/en/imprint/' : '/impresszum/'
      await expect(page.locator(`footer a[href="${imprint}"]`), url).toHaveCount(1)
      await expect(page.locator('footer a[href="/aszf/"]'), url).toHaveCount(1)
    }
  })
})

test.describe('AC6 technical SEO', () => {
  test('sitemap lists exactly the live pages and each answers 200', async ({ page, request }) => {
    const sitemap = await request.get('/sitemap.xml')
    expect(sitemap.status()).toBe(200)
    const locs = [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])
    expect(locs.sort()).toEqual(LIVE_PATHS.map(p => SITE + p).sort())
    for (const loc of locs) {
      const response = await page.goto(loc.replace(SITE, ''))
      expect(response?.status(), loc).toBe(200)
      await expect(page.locator('meta[name="robots"][content*="noindex"]'), loc).toHaveCount(0)
    }
    const robots = await (await request.get('/robots.txt')).text()
    expect(robots).toContain(`Sitemap: ${SITE}/sitemap.xml`)
  })

  test('home and package page descriptions, ProfessionalService JSON-LD', async ({ page }) => {
    await gotoHome(page)
    await expect(page.locator('meta[name="description"]').first()).toHaveAttribute('content', /kis- és középvállalkozás/)
    const graph = await page.locator('script[type="application/ld+json"]').evaluateAll(nodes => nodes.flatMap(node => {
      const data = JSON.parse(node.textContent!)
      return data['@graph'] ?? [data]
    }))
    const service = graph.find((item: { '@type': string }) => item['@type'] === 'ProfessionalService')
    expect(service).toBeTruthy()
    expect(service.email).toBe(EMAIL)
    expect(service.address).toMatchObject({ postalCode: '8944', addressLocality: 'Sárhida', streetAddress: 'Kossuth utca 32.', addressCountry: 'HU' })
    expect(service.areaServed).toMatchObject({ name: 'Magyarország' })
    expect(service.makesOffer).toHaveLength(6)
    // Every price line is listed: A has three, E two, F two; B–D have none.
    expect(service.makesOffer.map((offer: { priceSpecification?: unknown[] }) => offer.priceSpecification?.length ?? 0)).toEqual([3, 0, 0, 0, 2, 2])
    expect(graph.some((item: { '@type': string }) => item['@type'] === 'Person')).toBe(true)
    await switchToEnglish(page)
    await expect(page.locator('meta[name="description"]').first()).toHaveAttribute('content', /small and medium-sized businesses/i)
    await page.goto('/megrendeles/')
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /csomag/i)
  })
})

test.describe('AC7 quality', () => {
  test('home hero, packages and footer pass axe in both languages', async ({ page }) => {
    await gotoHome(page)
    const scan = () => new AxeBuilder({ page }).include('#hero').include('#csomagok').include('#rolam').include('footer').analyze()
    expect((await scan()).violations).toEqual([])
    await switchToEnglish(page)
    expect((await scan()).violations).toEqual([])
  })

  test('no horizontal scrolling at 375 px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await gotoHome(page)
    expect(await noHorizontalScroll(page), '/').toBe(true)
    for (const url of STATIC_PAGES) {
      await page.goto(url, { waitUntil: 'networkidle' })
      expect(await noHorizontalScroll(page), url).toBe(true)
    }
  })
})
