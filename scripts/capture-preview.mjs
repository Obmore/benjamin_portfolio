import { spawn } from 'node:child_process'
import { mkdirSync, copyFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const PORT = process.env.PREVIEW_PORT ?? '4173'
const BASE = process.env.BASE_URL ?? `http://127.0.0.1:${PORT}/`
const DOCS = join(process.cwd(), 'docs', 'preview')
const ARTIFACTS = process.env.ARTIFACTS_DIR ?? '/opt/cursor/artifacts'

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

async function waitForServer(url) {
  const start = Date.now()
  while (Date.now() - start < 20000) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(1500) })
      if (res.ok) return
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error(`Preview did not start at ${url}`)
}

async function shot(page, width, height, fullPage, reduced, destName, scrollTo = 0) {
  await page.setViewportSize({ width, height })
  if (reduced) {
    await page.emulateMedia({ reducedMotion: 'reduce' })
  } else {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
  }
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForSelector('h1')
  await Promise.race([
    page.evaluate(() => document.fonts.ready),
    page.waitForTimeout(3000),
  ])
  if (reduced) {
    await page.waitForSelector('.compare-stage', { timeout: 4000 }).catch(() => null)
  } else {
    await page.waitForSelector('.morph-stage.is-done', { timeout: 6000 }).catch(() => page.waitForTimeout(3500))
  }
  let y = 0
  if (typeof scrollTo === 'string') {
    y = await page.evaluate((sel) => {
      const el = document.querySelector(sel)
      if (!el) return 0
      return Math.max(0, Math.round(el.getBoundingClientRect().top + window.scrollY - 72))
    }, scrollTo)
  } else {
    y = scrollTo
  }
  await page.evaluate((nextY) => window.scrollTo(0, nextY), y)
  if (y) await page.waitForTimeout(180)
  mkdirSync(DOCS, { recursive: true })
  mkdirSync(ARTIFACTS, { recursive: true })
  const docsPath = join(DOCS, destName)
  await page.screenshot({ path: docsPath, fullPage, animations: reduced ? 'disabled' : 'allow' })
  copyFileSync(docsPath, join(ARTIFACTS, destName))
  console.log(`wrote ${docsPath}`)
}

async function run() {
  const killer = setTimeout(() => {
    console.error('capture timed out after 150s')
    process.exit(1)
  }, 150000)

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
    const context = await browser.newContext({
      colorScheme: 'light',
      locale: 'hu-HU',
    })
    await context.addInitScript(() => {
      localStorage.setItem('portfolio-locale', 'hu')
      document.documentElement.classList.remove('dark')
    })
    const page = await context.newPage()
    await shot(page, 1440, 900, true, false, 'full_1440.png')
    await shot(page, 390, 844, true, false, 'full_390.png')
    await shot(page, 390, 844, false, false, 'first_390x844.png')
    await shot(page, 390, 844, true, true, 'full_390_reduced_motion.png')
    await shot(page, 1440, 900, true, true, 'full_1440_reduced_motion.png')
    await shot(page, 390, 844, false, false, 'mid_390_process.png', '.process-diagram')
    await shot(page, 390, 844, false, false, 'mid_390_skills.png', '#kompetenciak')
    await shot(page, 390, 844, false, false, 'mid_390_explode.png', '#munkaim')
    await shot(page, 390, 844, false, false, 'mid_390_quote.png', '.mail-preview')
    await shot(page, 390, 844, false, false, 'mid_390_finale.png', '.signal-finale')
    await shot(page, 1440, 900, false, false, 'mid_1440_process.png', '.process-diagram')
    await shot(page, 1440, 900, false, false, 'mid_1440_skills.png', '#kompetenciak')
    await shot(page, 1440, 900, false, false, 'mid_1440_explode.png', '#munkaim')
    await shot(page, 1440, 900, false, false, 'mid_1440_quote.png', '.mail-preview')
    await browser.close()
  } finally {
    stopPreview(preview)
  }
  clearTimeout(killer)
  process.exit(0)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
