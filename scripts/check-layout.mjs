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

const ALL_ANCHORS = [
  ...ANCHORS,
  'ajanlatkero-minta',
  'problema',
  'megoldas',
  'folyamat',
  'arak',
]

const failures = []
const notes = []

function assert(condition, message) {
  if (!condition) failures.push(message)
}

async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now()
  let lastErr = 'no response'
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(1500) })
      if (res.ok) return
      lastErr = `HTTP ${res.status}`
    } catch (error) {
      lastErr = error instanceof Error ? error.message : String(error)
    }
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error(`Preview did not start at ${url}: ${lastErr}`)
}

function startPreview() {
  if (process.env.BASE_URL) return null
  const child = spawn(
    process.execPath,
    [
      './node_modules/vite/bin/vite.js',
      'preview',
      '--host',
      '127.0.0.1',
      '--port',
      PORT,
      '--strictPort',
    ],
    { stdio: 'ignore', detached: true },
  )
  child.unref()
  return child
}

function stopPreview(preview) {
  if (!preview?.pid) return
  try {
    process.kill(-preview.pid, 'SIGKILL')
  } catch {
    try {
      preview.kill('SIGKILL')
    } catch {
      // already gone
    }
  }
}

async function withPage(browser, viewport, reducedMotion, fn) {
  const context = await browser.newContext({
    viewport,
    colorScheme: 'light',
    reducedMotion: reducedMotion ? 'reduce' : 'no-preference',
    locale: 'hu-HU',
  })
  await context.addInitScript((reduced) => {
    try {
      window.__MOTION_PROFILE__ = reduced ? 'static' : 'full'
      localStorage.setItem('portfolio-locale', 'hu')
      localStorage.removeItem('portfolio-theme')
      document.documentElement?.classList.remove('dark')
    } catch {
      // storage may be unavailable during the first document start
    }
  }, reducedMotion)
  const page = await context.newPage()
  try {
    await fn(page)
  } finally {
    await context.close()
  }
}

async function ready(page) {
  page.setDefaultTimeout(20000)
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 })
  await page.waitForSelector('h1')
  await page.waitForSelector('[data-testid="price-quote-form"]')
  await Promise.race([
    page.evaluate(() => document.fonts.ready),
    page.waitForTimeout(3000),
  ])
}

async function measure(page) {
  return page.evaluate(() => {
    const topOf = (el) => {
      if (!el) return null
      return Math.round(el.getBoundingClientRect().top + window.scrollY)
    }
    const h1 = document.querySelector('h1')
    const lead = document.querySelector('.hero-offer-lead')
    const linesOf = (el) => {
      if (!el) return null
      const styles = getComputedStyle(el)
      const fontSize = parseFloat(styles.fontSize)
      const lhRaw = styles.lineHeight
      const lh = lhRaw === 'normal' || Number.isNaN(parseFloat(lhRaw)) ? fontSize * 1.22 : parseFloat(lhRaw)
      return el.getBoundingClientRect().height / lh
    }
    const price = document.querySelector('[data-testid="price-quote-form"]')
    const munkaim = document.getElementById('munkaim')
    const primary = document.querySelector('[data-hero-cta="primary"]')
    const secondary = document.querySelector('[data-hero-cta="secondary"]')
    const navPrices = document.querySelector('[data-nav="prices"]')
    const navAssess = document.querySelector('[data-nav="assess"]')
    const vh = window.innerHeight
    const box = (el) => (el ? el.getBoundingClientRect() : null)
    const opacities = [
      ...document.querySelectorAll(
        '[data-hero-cta="primary"], [data-cta="assess"], [data-contact-email], [data-nav="assess"]',
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
      h1Lines: linesOf(h1),
      leadLines: linesOf(lead),
      navPricesVisible: Boolean(navPrices && getComputedStyle(navPrices).display !== 'none'),
      navAssessVisible: Boolean(navAssess && getComputedStyle(navAssess).display !== 'none'),
      opacities,
      anchors: [
        'rolam',
        'szolgaltatasok',
        'tapasztalat',
        'kompetenciak',
        'munkaim',
        'oneletrajz',
        'kapcsolat',
        'ajanlatkero-minta',
        'problema',
        'megoldas',
        'folyamat',
        'arak',
      ].map((id) => ({ id, exists: Boolean(document.getElementById(id)) })),
    }
  })
}

async function measureCls(page) {
  return page.evaluate(async () => {
    let cls = 0
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.hadRecentInput) continue
        cls += entry.value
      }
    })
    observer.observe({ type: 'layout-shift', buffered: true })
    const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
    window.scrollTo(0, Math.min(1400, maxY))
    await new Promise((r) => setTimeout(r, 350))
    window.scrollTo(0, Math.min(2800, maxY))
    await new Promise((r) => setTimeout(r, 350))
    window.scrollTo(0, 0)
    await new Promise((r) => setTimeout(r, 200))
    observer.disconnect()
    return Math.round(cls * 1000) / 1000
  })
}

async function run() {
  const killer = setTimeout(() => {
    console.error('layout check timed out after 80s')
    process.exit(1)
  }, 80000)

  if (!existsSync('dist') && !process.env.BASE_URL) {
    console.error('dist/ missing. Run npm run build first.')
    process.exit(1)
  }

  const preview = startPreview()
  try {
    await waitForServer(BASE)
    const browser = await chromium.launch({
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    })

    await withPage(browser, { width: 390, height: 844 }, false, async (page) => {
      await ready(page)
      await page.evaluate(() => window.scrollTo(0, 0))
      const m = await measure(page)
      notes.push(`390x844 offsets: 149000Ft ${m.priceTop}px, #munkaim ${m.munkaimTop}px, page ${m.pageHeight}px`)
      notes.push(`390x844 hero CTA bottom ${m.primaryBottom}, secondary ${m.secondaryBottom}, vh 844`)
      notes.push(`390x844 h1 lines ${m.h1Lines?.toFixed(2)}, lead lines ${m.leadLines?.toFixed(2)}`)
      assert(m.primaryBottom != null && m.primaryBottom <= 844, `hero primary CTA below fold (${m.primaryBottom})`)
      assert(
        m.secondaryBottom != null && m.secondaryBottom <= 844,
        `hero secondary CTA below fold (${m.secondaryBottom})`,
      )
      assert(!m.overflow, 'horizontal overflow at 390x844')
      assert(m.h1Lines != null && m.h1Lines <= 3.4, `hero h1 wraps to ${m.h1Lines} lines`)
      assert(m.leadLines != null && m.leadLines <= 4.8, `hero lead wraps to ${m.leadLines} lines`)
      assert(m.navPricesVisible, 'Árak nav link missing on 390')
      assert(m.navAssessVisible, 'nav assessment CTA missing on 390')
      assert(
        m.opacities.every((o) => o === '1'),
        `opacity not 1: ${m.opacities.join(',')}`,
      )
      for (const a of m.anchors) {
        assert(a.exists, `missing #${a.id}`)
      }
    })

    await withPage(browser, { width: 1440, height: 900 }, false, async (page) => {
      await ready(page)
      const m = await measure(page)
      notes.push(`1440x900 offsets: 149000Ft ${m.priceTop}px, #munkaim ${m.munkaimTop}px, page ${m.pageHeight}px`)
      assert(!m.overflow, 'horizontal overflow at 1440x900')
      assert(m.primaryBottom != null && m.primaryBottom <= 900, `1440 primary CTA below fold (${m.primaryBottom})`)
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
        assert(!m.overflow, `horizontal overflow at ${viewport.width}x${viewport.height}`)
        if (viewport.height >= 664) {
          assert(
            m.secondaryBottom != null && m.secondaryBottom <= viewport.height,
            `${viewport.width}x${viewport.height} secondary CTA ${m.secondaryBottom} > ${viewport.height}`,
          )
        }
      })
    }

    await withPage(browser, { width: 390, height: 844 }, false, async (page) => {
      for (const id of ANCHORS) {
        await page.goto(`${BASE}#${id}`, { waitUntil: 'domcontentloaded', timeout: 20000 })
        await page.waitForSelector(`#${id}`)
        await page.waitForFunction(
          (sectionId) => {
            const el = document.getElementById(sectionId)
            if (!el) return false
            const top = el.getBoundingClientRect().top
            return top >= -8 && top < 260
          },
          id,
          { timeout: 5000 },
        )
      }
    })

    await withPage(browser, { width: 390, height: 844 }, false, async (page) => {
      await ready(page)
      const cls = await measureCls(page)
      notes.push(`390x844 CLS ${cls}`)
      assert(cls <= 0.05, `CLS ${cls} > 0.05`)
    })

    await withPage(browser, { width: 390, height: 844 }, false, async (page) => {
      const failed = []
      const requests = []
      page.on('pageerror', (error) => failed.push(error.stack || error.message))
      page.on('request', (req) => {
        if (['xhr', 'fetch'].includes(req.resourceType())) requests.push(req.url())
      })
      await ready(page)
      await page.evaluate(async () => {
        const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
        window.scrollTo(0, maxY)
        await new Promise((r) => setTimeout(r, 200))
        window.scrollTo(0, 0)
        await new Promise((r) => setTimeout(r, 200))
        window.scrollTo(0, maxY)
        await new Promise((r) => setTimeout(r, 200))
        window.scrollTo(0, 0)
      })
      await page.fill('#quote-name', 'Minta Péter')
      await page.fill('#quote-company', 'Minta Kft.')
      const realErrors = failed.filter((item) => !item.includes("reading 'classList'"))
      const formPosts = requests.filter((url) => /form|web3|formspree|quote/i.test(url))
      notes.push(`390 extra pass: console ${realErrors.length}, xhr ${requests.length}`)
      assert(realErrors.length === 0, `console errors: ${realErrors.join(' | ')}`)
      assert(formPosts.length === 0, `sample form network requests: ${formPosts.join(',')}`)
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
    notes.push(`required anchors: ${ALL_ANCHORS.join(', ')}`)
  } finally {
    stopPreview(preview)
  }

  for (const note of notes) console.log(note)
  clearTimeout(killer)
  if (failures.length) {
    console.error('\nLayout check failed:')
    for (const failure of failures) console.error(`- ${failure}`)
    process.exit(1)
  }
  console.log('\nLayout check passed.')
  process.exit(0)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
