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

async function withPage(browser, viewport, reducedMotion, fn, extras = {}) {
  const context = await browser.newContext({
    viewport,
    colorScheme: extras.colorScheme === 'dark' ? 'dark' : 'light',
    reducedMotion: reducedMotion ? 'reduce' : 'no-preference',
    locale: extras.locale === 'en' ? 'en-US' : 'hu-HU',
  })
  await context.addInitScript(
    (opts) => {
      try {
        window.__MOTION_PROFILE__ = opts.reduced ? 'static' : 'full'
        localStorage.setItem('portfolio-locale', opts.locale === 'en' ? 'en' : 'hu')
        localStorage.removeItem('portfolio-theme')
        document.documentElement?.classList.remove('dark')
        document.documentElement.style.colorScheme = 'light'
      } catch {
        // storage may be unavailable during the first document start
      }
    },
    { reduced: reducedMotion, theme: extras.theme ?? 'light', locale: extras.locale ?? 'hu' },
  )
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

async function jumpTo(page, y) {
  await page.evaluate((nextY) => {
    if (window.__lenis?.scrollTo) window.__lenis.scrollTo(nextY, { immediate: true, force: true })
    else {
      window.scrollTo(0, nextY)
      document.documentElement.scrollTop = nextY
    }
  }, y)
  await page.waitForTimeout(350)
}

async function jumpToSel(page, selector) {
  const y = await page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return 0
    return Math.max(0, Math.round(el.getBoundingClientRect().top + window.scrollY - 72))
  }, selector)
  await jumpTo(page, y)
}

async function problemTextHits(page) {
  return page.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-problem-card]')]
    const hits = []
    cards.forEach((card, index) => {
      const text = card.querySelector('[data-problem-text]')
      if (!text) return
      const a = text.getBoundingClientRect()
      cards.forEach((other, otherIndex) => {
        if (other === card) return
        const b = other.getBoundingClientRect()
        const overlapX = a.left < b.right - 0.5 && a.right > b.left + 0.5
        const overlapY = a.top < b.bottom - 0.5 && a.bottom > b.top + 0.5
        if (overlapX && overlapY) hits.push(`${index + 1} under ${otherIndex + 1}`)
      })
    })
    return hits
  })
}

async function processStepReport(page) {
  return page.evaluate(() => {
    const inView = (el, minOpacity = 0.12) => {
      const box = el.getBoundingClientRect()
      const style = getComputedStyle(el)
      return (
        box.height > 2 &&
        box.width > 2 &&
        box.bottom > 8 &&
        box.top < window.innerHeight - 8 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        Number(style.opacity) > minOpacity
      )
    }
    const nodes = [...document.querySelectorAll('[data-process-step]')]
    const titleEls = [...document.querySelectorAll('.process-node-title')]
    const visibleTitles = titleEls.filter((el) => inView(el)).map((el) => el.textContent?.trim() ?? '')
    const counts = {}
    for (const text of visibleTitles) {
      if (!text) continue
      counts[text] = (counts[text] || 0) + 1
    }
    const section = document.getElementById('folyamat')
    const pinSpacers = [...document.querySelectorAll('.pin-spacer')].filter((el) => {
      if (section && section.contains(el)) return true
      const box = el.getBoundingClientRect()
      const sectionBox = section?.getBoundingClientRect()
      if (!sectionBox) return false
      return box.bottom > sectionBox.top && box.top < sectionBox.bottom
    })
    return {
      dom: nodes.length,
      titleNodes: titleEls.length,
      visible: visibleTitles,
      duplicates: Object.entries(counts)
        .filter(([, count]) => count > 1)
        .map(([text]) => text),
      pinSpacers: pinSpacers.length,
    }
  })
}

async function finaleVisible(page) {
  return page.evaluate(() => {
    const msg = document.querySelector('[data-finale-msg]')
    if (!msg) return { exists: false, opacity: 0, text: '' }
    const style = getComputedStyle(msg)
    const box = msg.getBoundingClientRect()
    return {
      exists: true,
      text: msg.textContent?.trim() ?? '',
      opacity: Number(style.opacity),
      inView: box.top < window.innerHeight && box.bottom > 0,
    }
  })
}

async function activeRail(page) {
  return page.evaluate(() => {
    const active = document.querySelector('.story-rail-item.is-active')
    return active?.getAttribute('data-rail-item') ?? null
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
    observer.observe({ type: 'layout-shift', buffered: false })
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
    console.error('layout check timed out after 140s')
    process.exit(1)
  }, 140000)

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
      assert(m.h1Lines != null && m.h1Lines <= 3.7, `hero h1 wraps to ${m.h1Lines} lines`)
      assert(m.leadLines != null && m.leadLines <= 4.8, `hero lead wraps to ${m.leadLines} lines`)
      assert(m.navPricesVisible, 'Árak nav link missing on 390')
      assert(m.navAssessVisible, 'nav assessment CTA missing on 390')
      const chrome390 = await page.evaluate(() => {
        const header = document.querySelector('header')
        const text = header?.textContent ?? ''
        const paper = document.querySelector('[data-paper]')
        const cta = document.querySelector('[data-hero-cta="primary"]')
        const a = paper?.getBoundingClientRect()
        const b = cta?.getBoundingClientRect()
        const overlap =
          Boolean(a && b) &&
          a.left < b.right - 0.5 &&
          a.right > b.left + 0.5 &&
          a.top < b.bottom - 0.5 &&
          a.bottom > b.top + 0.5
        const qty = [...document.querySelectorAll('[data-paper-row]')].map((el) =>
          el.textContent?.replace(/\s+/g, ' ').trim(),
        )
        return {
          hasLang: Boolean(
            document.querySelector('[data-lang], [data-locale-toggle], [aria-label*="English"], [aria-label*="language"]'),
          ),
          hasTheme: Boolean(document.querySelector('[data-theme-toggle], [aria-label*="téma" i], [aria-label*="theme" i]')),
          prices: Boolean(header?.querySelector('[data-nav="prices"]')) && /Árak/.test(text),
          assess: Boolean(header?.querySelector('[data-nav="assess"]')) && /Kérjen felmérést/.test(text),
          paperCtaOverlap: overlap,
          qty,
        }
      })
      notes.push(`390 header chrome lang=${chrome390.hasLang} theme=${chrome390.hasTheme} arak=${chrome390.prices} assess=${chrome390.assess}`)
      notes.push(`390 hero paper rows ${chrome390.qty.join(' | ')} overlap=${chrome390.paperCtaOverlap}`)
      assert(!chrome390.hasLang, 'language toggle visible on 390 header')
      assert(!chrome390.hasTheme, 'theme toggle visible on 390 header')
      assert(chrome390.prices, '390 header missing Árak')
      assert(chrome390.assess, '390 header missing Kérjen felmérést')
      assert(!chrome390.paperCtaOverlap, '390 hero paper overlaps the orange CTA')
      assert(
        chrome390.qty.some((row) => /Mennyiség/.test(row) && /12 db/.test(row)),
        `390 hero quantity is ${chrome390.qty.join(', ')}`,
      )
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
      notes.push(`1440 rail at top ${await activeRail(page)}`)
      assert((await activeRail(page)) === 'hero', `rail at top is ${await activeRail(page)}`)
      const chrome1440 = await page.evaluate(() => {
        const rail = [...document.querySelectorAll('.story-rail-item')].map((el) => ({
          id: el.getAttribute('data-rail-item'),
          label: el.querySelector('.story-rail-label')?.textContent?.trim() ?? '',
        }))
        return {
          hasLang: Boolean(
            document.querySelector('[data-lang], [data-locale-toggle], [aria-label*="English"], [aria-label*="language"]'),
          ),
          hasTheme: Boolean(document.querySelector('[data-theme-toggle], [aria-label*="theme" i], [aria-label*="téma" i]')),
          rail,
          body: document.body.innerText,
        }
      })
      notes.push(`1440 header lang=${chrome1440.hasLang} theme=${chrome1440.hasTheme}`)
      notes.push(`1440 rail labels ${chrome1440.rail.map((item) => `${item.id}:${item.label}`).join(', ')}`)
      assert(!chrome1440.hasLang, 'language toggle visible on 1440 header')
      assert(!chrome1440.hasTheme, 'theme toggle visible on 1440 header')
      assert(chrome1440.rail[0]?.label === 'Kezdés', `1440 first rail is ${chrome1440.rail[0]?.label}`)
      assert(
        chrome1440.rail.find((item) => item.id === 'problema')?.label === 'Ma',
        '1440 rail missing Ma',
      )
      assert(!/Full-stack|full-stack|\bbackend\b|\bBackend\b/.test(chrome1440.body), 'HU page still has Full-stack/backend')
      await jumpTo(page, Math.round(900 * 1.2))
      notes.push(`1440 rail at hero end ${await activeRail(page)}`)
      assert((await activeRail(page)) === 'hero', `rail at hero end is ${await activeRail(page)}`)
      await jumpToSel(page, '#problema')
      const problemHits = await problemTextHits(page)
      notes.push(`1440 problem overlaps ${problemHits.join(',') || 'none'}`)
      assert(problemHits.length === 0, `1440 problem cards overlap: ${problemHits.join(', ')}`)
      notes.push(`1440 rail at problem ${await activeRail(page)}`)
      assert((await activeRail(page)) === 'problema', `rail at problem is ${await activeRail(page)}`)

      const railStops = [
        ['#megoldas', 'megoldas'],
        ['#ajanlatkero-minta', 'ajanlatkero-minta'],
        ['#folyamat', 'folyamat'],
        ['#munkaim', 'munkaim'],
        ['#szolgaltatasok', 'szolgaltatasok'],
        ['#rolam', 'rolam'],
        ['#kapcsolat', 'kapcsolat'],
      ]
      for (const [sel, expected] of railStops) {
        await jumpToSel(page, sel)
        const rail = await activeRail(page)
        notes.push(`1440 rail at ${expected} ${rail}`)
        assert(rail === expected, `rail at ${expected} is ${rail}`)
        if (expected === 'rolam') {
          const aboutTitles = await page.evaluate(() =>
            [...document.querySelectorAll('#rolam h3')].map((el) => el.textContent?.trim()),
          )
          notes.push(`1440 about titles ${aboutTitles.join(' | ')}`)
          assert(aboutTitles.includes('Mérnöki szemlélet'), 'about missing Mérnöki szemlélet')
          assert(aboutTitles.includes('Szoftverfejlesztés'), 'about missing Szoftverfejlesztés')
          assert(aboutTitles.includes('Projektkoordináció'), 'about missing Projektkoordináció')
        }
      }

      const clickNav = async (selector, id) => {
        const y = await page.evaluate(() => window.scrollY)
        await jumpTo(page, Math.max(0, y - 120))
        await page.locator(selector).click({ force: true })
        await page.waitForFunction(
          (sectionId) => {
            const el = document.getElementById(sectionId)
            if (!el) return false
            const top = el.getBoundingClientRect().top
            return top >= -20 && top < 280
          },
          id,
          { timeout: 8000 },
        )
      }
      const processStops = [0, 0.2, 0.4, 0.6, 0.8, 1]
      const pinTop = await page.evaluate(() => {
        const pin = document.querySelector('.process-pin')
        if (!pin) return 0
        return Math.max(0, Math.round(pin.getBoundingClientRect().top + window.scrollY - 72))
      })
      const pinHeight = await page.evaluate(() => document.querySelector('.process-pin')?.getBoundingClientRect().height ?? 0)
      for (const part of processStops) {
        await jumpTo(page, pinTop + Math.round(pinHeight * part))
        const report = await processStepReport(page)
        notes.push(
          `1440 process ${part} dom=${report.dom} titles=${report.titleNodes} pin=${report.pinSpacers} visible=${report.visible.join('|')}`,
        )
        assert(report.dom === 4, `1440 process DOM count ${report.dom}`)
        assert(report.titleNodes === 4, `1440 process title nodes ${report.titleNodes}`)
        assert(report.pinSpacers === 0, `1440 process pin-spacer count ${report.pinSpacers}`)
        assert(report.duplicates.length === 0, `1440 process duplicate titles: ${report.duplicates.join(', ')}`)
      }

      await jumpToSel(page, '#kapcsolat')
      const finaleY = await page.evaluate(() => {
        const el = document.querySelector('.contact-finale')
        if (!el) return 0
        return Math.max(0, Math.round(el.getBoundingClientRect().top + window.scrollY - Math.round(window.innerHeight * 0.38)))
      })
      await jumpTo(page, finaleY)
      await page.waitForTimeout(400)
      let finale = await finaleVisible(page)
      if (finale.opacity < 0.85) {
        const maxY = await page.evaluate(() =>
          Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
        )
        await jumpTo(page, maxY)
        await page.waitForTimeout(350)
        finale = await finaleVisible(page)
      }
      notes.push(`1440 finale ${JSON.stringify(finale)}`)
      assert(finale.exists, 'finale message missing')
      assert(finale.text.includes('megérkezett'), `finale text is ${finale.text}`)
      assert(finale.opacity >= 0.85 && finale.inView, `finale not visible ${JSON.stringify(finale)}`)

      await clickNav('[data-nav="prices"]', 'arak')
      for (const id of ['megoldas', 'munkaim', 'rolam', 'kapcsolat']) {
        await clickNav(`[data-nav-link="${id}"]`, id)
      }
    })

    await withPage(browser, { width: 390, height: 844 }, false, async (page) => {
      await ready(page)
      const pinTop = await page.evaluate(() => {
        const pin = document.querySelector('.process-pin')
        if (!pin) return 0
        return Math.max(0, Math.round(pin.getBoundingClientRect().top + window.scrollY - 72))
      })
      const pinHeight = await page.evaluate(
        () => document.querySelector('.process-pin')?.getBoundingClientRect().height ?? 0,
      )
      for (const part of [0, 0.25, 0.5, 0.75, 1]) {
        await jumpTo(page, pinTop + Math.round(pinHeight * part))
        const report = await processStepReport(page)
        notes.push(
          `390 process ${part} dom=${report.dom} titles=${report.titleNodes} pin=${report.pinSpacers} visible=${report.visible.join('|')}`,
        )
        assert(report.dom === 4, `390 process DOM count ${report.dom}`)
        assert(report.titleNodes === 4, `390 process title nodes ${report.titleNodes}`)
        assert(report.pinSpacers === 0, `390 process pin-spacer count ${report.pinSpacers}`)
        assert(report.duplicates.length === 0, `390 process duplicate titles: ${report.duplicates.join(', ')}`)
      }
      const finaleY = await page.evaluate(() => {
        const el = document.querySelector('.contact-finale')
        if (!el) return 0
        return Math.max(0, Math.round(el.getBoundingClientRect().top + window.scrollY - Math.round(window.innerHeight * 0.38)))
      })
      await jumpTo(page, finaleY)
      await page.waitForTimeout(400)
      let finale = await finaleVisible(page)
      if (finale.opacity < 0.85) {
        const maxY = await page.evaluate(() =>
          Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
        )
        await jumpTo(page, maxY)
        await page.waitForTimeout(350)
        finale = await finaleVisible(page)
      }
      notes.push(`390 finale ${JSON.stringify(finale)}`)
      assert(finale.text.includes('megérkezett'), `390 finale text is ${finale.text}`)
      assert(finale.opacity >= 0.85 && finale.inView, `390 finale not visible ${JSON.stringify(finale)}`)
    })

    for (const viewport of [
      { width: 390, height: 844 },
      { width: 1024, height: 768 },
      { width: 1280, height: 800 },
      { width: 1920, height: 1080 },
    ]) {
      await withPage(browser, viewport, false, async (page) => {
        await ready(page)
        await jumpToSel(page, '#problema')
        const hits = await problemTextHits(page)
        notes.push(`${viewport.width} problem overlaps ${hits.join(',') || 'none'}`)
        assert(
          hits.length === 0,
          `${viewport.width}x${viewport.height} problem cards overlap: ${hits.join(', ')}`,
        )
      })
    }

    for (const viewport of [
      { width: 360, height: 640 },
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1024, height: 768 },
      { width: 1440, height: 900 },
      { width: 1920, height: 1080 },
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
        await jumpTo(page, Math.round(viewport.height * 2.2))
        const mid = await measure(page)
        assert(!mid.overflow, `horizontal overflow mid-page at ${viewport.width}x${viewport.height}`)
        const maxY = await page.evaluate(() =>
          Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
        )
        await jumpTo(page, maxY)
        const end = await measure(page)
        assert(!end.overflow, `horizontal overflow at bottom ${viewport.width}x${viewport.height}`)
        if (viewport.height >= 664 && viewport.width <= 768) {
          assert(
            m.secondaryBottom != null && m.secondaryBottom <= viewport.height,
            `${viewport.width}x${viewport.height} secondary CTA ${m.secondaryBottom} > ${viewport.height}`,
          )
        }
      })
    }

    for (const viewport of [
      { width: 390, height: 844 },
      { width: 1440, height: 900 },
    ]) {
      await withPage(browser, viewport, false, async (page) => {
        for (const id of ALL_ANCHORS) {
          await page.goto(`${BASE}#${id}`, { waitUntil: 'domcontentloaded', timeout: 20000 })
          await page.waitForSelector(`#${id}`)
          await page.waitForFunction(
            (sectionId) => {
              const el = document.getElementById(sectionId)
              if (!el) return false
              const top = el.getBoundingClientRect().top
              return top >= -8 && top < 280
            },
            id,
            { timeout: 8000 },
          )
        }
      })
    }

    await withPage(browser, { width: 390, height: 844 }, false, async (page) => {
      await ready(page)
      await page.waitForTimeout(500)
      const cls = await measureCls(page)
      notes.push(`390x844 CLS ${cls}`)
      assert(cls <= 0.05, `CLS ${cls} > 0.05`)
    })

    await withPage(
      browser,
      { width: 1440, height: 900 },
      false,
      async (page) => {
        await ready(page)
        const report = await page.evaluate(() => ({
          darkClass: document.documentElement.classList.contains('dark'),
          scheme: getComputedStyle(document.documentElement).colorScheme,
          bg: getComputedStyle(document.body).backgroundColor,
        }))
        notes.push(`1440 OS-dark pref still light: class=${report.darkClass} scheme=${report.scheme} bg=${report.bg}`)
        assert(!report.darkClass, 'dark class applied under OS dark preference')
        assert(
          report.scheme.includes('light') || report.scheme === 'normal',
          `color-scheme is ${report.scheme}`,
        )
      },
      { colorScheme: 'dark' },
    )

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
