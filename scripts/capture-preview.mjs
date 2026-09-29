import { spawn } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readdirSync, renameSync } from 'node:fs'
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

async function prepare(page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForSelector('h1')
  await Promise.race([
    page.evaluate(() => document.fonts.ready),
    page.waitForTimeout(3000),
  ])
}

async function saveShot(page, destName, fullPage = false) {
  mkdirSync(DOCS, { recursive: true })
  mkdirSync(ARTIFACTS, { recursive: true })
  const docsPath = join(DOCS, destName)
  await page.screenshot({ path: docsPath, fullPage, animations: 'allow' })
  copyFileSync(docsPath, join(ARTIFACTS, destName))
  console.log(`wrote ${docsPath}`)
}

async function scrollToSel(page, sel) {
  const y = await page.evaluate((selector) => {
    const el = document.querySelector(selector)
    if (!el) return 0
    return Math.max(0, Math.round(el.getBoundingClientRect().top + window.scrollY - 72))
  }, sel)
  await page.evaluate((nextY) => window.scrollTo(0, nextY), y)
  await page.waitForTimeout(280)
}

async function shotSet(page, width, height) {
  await page.setViewportSize({ width, height })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await prepare(page)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(200)
  await saveShot(page, `hero_top_${width}x${height}.png`)
  await page.evaluate(() => window.scrollTo(0, Math.round(window.innerHeight * 0.85)))
  await page.waitForTimeout(350)
  await saveShot(page, `hero_morph_${width}x${height}.png`)
  await scrollToSel(page, '#problema')
  await saveShot(page, `problem_${width}x${height}.png`)
  await scrollToSel(page, '#megoldas')
  await saveShot(page, `solution_${width}x${height}.png`)
  await scrollToSel(page, '#ajanlatkero-minta')
  await saveShot(page, `tryit_${width}x${height}.png`)
  await scrollToSel(page, '#folyamat')
  await saveShot(page, `process_${width}x${height}.png`)
  await scrollToSel(page, '#munkaim')
  await saveShot(page, `work_${width}x${height}.png`)
  await scrollToSel(page, '#arak')
  await saveShot(page, `prices_${width}x${height}.png`)
  await scrollToSel(page, '#rolam')
  await saveShot(page, `about_${width}x${height}.png`)
  await scrollToSel(page, '#kapcsolat')
  await saveShot(page, `contact_${width}x${height}.png`)
  await page.evaluate(() => window.scrollTo(0, 0))
  await saveShot(page, `full_${width}.png`, true)
}

async function recordScroll(browser, width, height, destName) {
  const context = await browser.newContext({
    viewport: { width, height },
    colorScheme: 'light',
    locale: 'hu-HU',
    reducedMotion: 'no-preference',
    recordVideo: {
      dir: ARTIFACTS,
      size: { width, height },
    },
  })
  await context.addInitScript(() => {
    window.__MOTION_PROFILE__ = 'full'
    localStorage.setItem('portfolio-locale', 'hu')
    document.documentElement.classList.remove('dark')
  })
  const page = await context.newPage()
  await prepare(page)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(400)
  const maxY = await page.evaluate(() =>
    Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
  )
  const steps = 28
  for (let i = 1; i <= steps; i += 1) {
    await page.evaluate(
      ({ next, total, end }) => window.scrollTo(0, Math.round((next / total) * end)),
      { next: i, total: steps, end: maxY },
    )
    await page.waitForTimeout(220)
  }
  await page.waitForTimeout(500)
  const video = page.video()
  await page.close()
  await context.close()
  if (!video) return
  const src = await video.path()
  const dest = join(ARTIFACTS, destName)
  try {
    renameSync(src, dest)
  } catch {
    copyFileSync(src, dest)
  }
  console.log(`wrote ${dest}`)
}

async function run() {
  const killer = setTimeout(() => {
    console.error('capture timed out after 180s')
    process.exit(1)
  }, 240000)

  if (!existsSync('dist') && !process.env.BASE_URL) {
    console.error('dist/ missing. Run npm run build first.')
    process.exit(1)
  }
  mkdirSync(DOCS, { recursive: true })
  mkdirSync(ARTIFACTS, { recursive: true })
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
      window.__MOTION_PROFILE__ = 'full'
      localStorage.setItem('portfolio-locale', 'hu')
      document.documentElement.classList.remove('dark')
    })
    const page = await context.newPage()
    await shotSet(page, 1440, 900)
    await shotSet(page, 390, 844)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await context.addInitScript(() => {
      window.__MOTION_PROFILE__ = 'static'
    })
    await prepare(page)
    await saveShot(page, 'full_390_reduced_motion.png', true)
    await context.close()
    await recordScroll(browser, 1440, 900, 'scroll_1440x900.webm')
    await recordScroll(browser, 390, 844, 'scroll_390x844.webm')
    await browser.close()
    for (const name of readdirSync(ARTIFACTS)) {
      if (name.endsWith('.webm') || name.endsWith('.png')) {
        console.log(`artifact ${join(ARTIFACTS, name)}`)
      }
    }
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
