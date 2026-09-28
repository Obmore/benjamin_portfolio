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
  return spawn(
    'npx',
    ['vite', 'preview', '--host', '127.0.0.1', '--port', PORT, '--strictPort'],
    { stdio: 'pipe' },
  )
}

async function waitForServer(url) {
  const start = Date.now()
  while (Date.now() - start < 20000) {
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

async function shot(page, width, height, fullPage, reduced, destName) {
  await page.setViewportSize({ width, height })
  if (reduced) {
    await page.emulateMedia({ reducedMotion: 'reduce' })
  } else {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
  }
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForSelector('h1')
  await page.evaluate(() => document.fonts.ready)
  if (!reduced) {
    await page.waitForSelector('.morph-stage.is-done', { timeout: 6000 }).catch(() => page.waitForTimeout(3500))
  }
  await page.evaluate(() => window.scrollTo(0, 0))
  mkdirSync(DOCS, { recursive: true })
  mkdirSync(ARTIFACTS, { recursive: true })
  const docsPath = join(DOCS, destName)
  await page.screenshot({ path: docsPath, fullPage, animations: reduced ? 'disabled' : 'allow' })
  copyFileSync(docsPath, join(ARTIFACTS, destName))
  console.log(`wrote ${docsPath}`)
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
    await browser.close()
  } finally {
    preview?.kill()
  }
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
