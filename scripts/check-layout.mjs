import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { chromium } from 'playwright'

const PORT = process.env.PREVIEW_PORT ?? '4173'
const BASE = process.env.BASE_URL ?? `http://127.0.0.1:${PORT}/`
const ANCHORS = [
  'rolam',
  'szolgaltatasok',
  'tapasztalat',
  'kompetenciak',
  'munkaim',
  'oneletrajz',
  'kapcsolat',
]

const failures = []
const notes = []

function assert(condition, message) {
  if (!condition) failures.push(message)
}

async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error(`Preview did not start at ${url}`)
}

function startPreview() {
  if (process.env.BASE_URL) return null
  const child = spawn(
    'npx',
    ['vite', 'preview', '--host', '127.0.0.1', '--port', PORT, '--strictPort'],
    { stdio: 'pipe' },
  )
  return child
}

async function withPage(browser, viewport, reducedMotion, fn) {
  const context = await browser.newContext({
    viewport,
    colorScheme: 'light',
    reducedMotion: reducedMotion ? 'reduce' : 'no-preference',
    locale: 'hu-HU',
  })
  await context.addInitScript(() => {
    localStorage.setItem('portfolio-locale', 'hu')
    localStorage.removeItem('portfolio-theme')
    document.documentElement.classList.remove('dark')
  })
  const page = await context.newPage()
  try {
    await fn(page)
  } finally {
    await context.close()
  }
}

async function ready(page) {
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForSelector('h1')
  await page.waitForSelector('[data-testid="price-quote-form"]')
}

async function measure(page) {
  return page.evaluate(() => {
    const topOf = (el) => {
      if (!el) return null
      return Math.round(el.getBoundingClientRect().top + window.scrollY)
    }
    const price = document.querySelector('[data-testid="price-quote-form"]')
    const munkaim = document.getElementById('munkaim')
    const primary = document.querySelector('[data-hero-cta="primary"]')
    const secondary = document.querySelector('[data-hero-cta="secondary"]')
    const email = document.querySelector('[data-hero-email]')
    const vh = window.innerHeight
    const box = (el) => (el ? el.getBoundingClientRect() : null)
    const opacities = [
      ...document.querySelectorAll(
        '[data-testid="price-quote-form"], [data-hero-cta="primary"], [data-cta="assess"], [data-contact-email], [data-hero-email]',
      ),
    ].map((el) => getComputedStyle(el).opacity)

    return {
      priceTop: topOf(price),
      munkaimTop: topOf(munkaim),
      pageHeight: document.documentElement.scrollHeight,
      viewport: { w: window.innerWidth, h: vh },
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      primaryBottom: box(primary)?.bottom ?? null,
      secondaryBottom: box(secondary)?.bottom ?? null,
      emailBottom: box(email)?.bottom ?? null,
      opacities,
      anchors: ['rolam', 'szolgaltatasok', 'tapasztalat', 'kompetenciak', 'munkaim', 'oneletrajz', 'kapcsolat', 'ajanlatkero-minta']
        .map((id) => ({ id, exists: Boolean(document.getElementById(id)) })),
    }
  })
}

async function run() {
  if (!existsSync('dist') && !process.env.BASE_URL) {
    console.error('dist/ missing. Run npm run build first.')
    process.exit(1)
  }

  const preview = startPreview()
  try {
    await waitForServer(BASE)
    const browser = await chromium.launch()

    await withPage(browser, { width: 390, height: 844 }, false, async (page) => {
      await ready(page)
      await page.evaluate(() => window.scrollTo(0, 0))
      const m = await measure(page)
      notes.push(`390x844 offsets: 149000Ft ${m.priceTop}px, #munkaim ${m.munkaimTop}px, page ${m.pageHeight}px`)
      notes.push(
        `390x844 hero CTA bottom ${m.primaryBottom}, secondary ${m.secondaryBottom}, email ${m.emailBottom}, vh 844`,
      )
      assert(m.primaryBottom != null && m.primaryBottom <= 844, `hero primary CTA below fold (${m.primaryBottom})`)
      assert(
        m.secondaryBottom != null && m.secondaryBottom <= 844,
        `hero secondary CTA below fold (${m.secondaryBottom})`,
      )
      assert(m.emailBottom != null && m.emailBottom <= 844, `hero email below fold (${m.emailBottom})`)
      assert(m.priceTop != null && m.priceTop <= 1100, `first price top ${m.priceTop} > 1100`)
      assert(m.munkaimTop != null && m.munkaimTop <= 2600, `#munkaim top ${m.munkaimTop} > 2600`)
      assert(!m.overflow, 'horizontal overflow at 390x844')
      assert(
        m.opacities.every((o) => o === '1'),
        `opacity not 1: ${m.opacities.join(',')}`,
      )
      for (const a of m.anchors.filter((x) => x.id !== 'ajanlatkero-minta')) {
        assert(a.exists, `missing #${a.id}`)
      }
      assert(
        m.anchors.find((x) => x.id === 'ajanlatkero-minta')?.exists,
        'missing #ajanlatkero-minta',
      )
    })

    await withPage(browser, { width: 1440, height: 900 }, false, async (page) => {
      await ready(page)
      const m = await measure(page)
      notes.push(`1440x900 offsets: 149000Ft ${m.priceTop}px, #munkaim ${m.munkaimTop}px, page ${m.pageHeight}px`)
      assert(m.priceTop != null && m.priceTop <= 1100, `1440 first price top ${m.priceTop} > 1100`)
      assert(!m.overflow, 'horizontal overflow at 1440x900')
    })

    for (const viewport of [
      { width: 360, height: 640 },
      { width: 390, height: 664 },
      { width: 768, height: 1024 },
    ]) {
      await withPage(browser, viewport, false, async (page) => {
        await ready(page)
        await page.evaluate(() => window.scrollTo(0, 0))
        const m = await measure(page)
        assert(
          m.primaryBottom != null && m.primaryBottom <= viewport.height,
          `${viewport.width}x${viewport.height} primary CTA ${m.primaryBottom} > ${viewport.height}`,
        )
        assert(
          m.secondaryBottom != null && m.secondaryBottom <= viewport.height,
          `${viewport.width}x${viewport.height} secondary CTA ${m.secondaryBottom} > ${viewport.height}`,
        )
        assert(!m.overflow, `horizontal overflow at ${viewport.width}x${viewport.height}`)
      })
    }

    await withPage(browser, { width: 390, height: 844 }, false, async (page) => {
      await ready(page)
      for (const id of ANCHORS) {
        await page.evaluate((sectionId) => {
          window.location.hash = sectionId
        }, id)
        await page.waitForTimeout(350)
        const top = await page.locator(`#${id}`).evaluate((el) => el.getBoundingClientRect().top)
        assert(Math.abs(top) < 220, `hash #${id} did not scroll into view (top ${top})`)
      }
    })

    await withPage(browser, { width: 390, height: 844 }, true, async (page) => {
      await ready(page)
      const running = await page.evaluate(() => {
        const hero = document.getElementById('hero')
        if (!hero) return -1
        return hero.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length
      })
      assert(running === 0, `reduced-motion hero still has ${running} running animations`)
    })

    await browser.close()
  } finally {
    preview?.kill()
  }

  for (const note of notes) console.log(note)
  if (failures.length) {
    console.error('\nLayout check failed:')
    for (const failure of failures) console.error(`- ${failure}`)
    process.exit(1)
  }
  console.log('\nLayout check passed.')
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
