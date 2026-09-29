import { spawn, spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, renameSync, statSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const PORT = process.env.PREVIEW_PORT ?? '4173'
const BASE = process.env.BASE_URL ?? `http://127.0.0.1:${PORT}/`
const DOCS = join(process.cwd(), 'docs', 'preview')
const ARTIFACTS = process.env.ARTIFACTS_DIR ?? '/opt/cursor/artifacts'
const MAX_MP4 = 6 * 1024 * 1024

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

async function jumpScroll(page, y) {
  await page.evaluate((nextY) => {
    const lenis = window.__lenis
    if (lenis?.scrollTo) {
      lenis.scrollTo(nextY, { immediate: true, force: true })
    } else {
      window.scrollTo(0, nextY)
      document.documentElement.scrollTop = nextY
    }
    window.dispatchEvent(new Event('scroll'))
  }, y)
  await page.waitForTimeout(480)
}

async function scrollToSel(page, sel, extra = 0) {
  const y = await page.evaluate(
    ({ selector, extraY }) => {
      const el = document.querySelector(selector)
      if (!el) return 0
      return Math.max(0, Math.round(el.getBoundingClientRect().top + window.scrollY + extraY - 72))
    },
    { selector: sel, extraY: extra },
  )
  await jumpScroll(page, y)
}

async function saveShot(page, destName) {
  mkdirSync(DOCS, { recursive: true })
  mkdirSync(ARTIFACTS, { recursive: true })
  const docsPath = join(DOCS, destName)
  await page.screenshot({ path: docsPath, fullPage: false, animations: 'allow' })
  copyFileSync(docsPath, join(ARTIFACTS, destName))
  console.log(`wrote ${docsPath}`)
}

async function scrollProcessMid(page) {
  const y = await page.evaluate(() => {
    const pin = document.querySelector('.process-pin')
    if (!pin) return 0
    const top = pin.getBoundingClientRect().top + window.scrollY
    const height = pin.getBoundingClientRect().height
    return Math.max(0, Math.round(top + height * 0.45 - 80))
  })
  await jumpScroll(page, y)
}

async function scrollContactEnd(page) {
  const y = await page.evaluate(() => {
    const el = document.querySelector('.contact-finale')
    if (!el) return 0
    return Math.max(
      0,
      Math.round(el.getBoundingClientRect().top + window.scrollY - Math.round(window.innerHeight * 0.36)),
    )
  })
  await jumpScroll(page, y)
  const visible = await page.evaluate(() => {
    const msg = document.querySelector('[data-finale-msg]')
    if (!msg) return false
    const style = getComputedStyle(msg)
    const box = msg.getBoundingClientRect()
    return (
      Number(style.opacity) >= 0.85 &&
      style.visibility !== 'hidden' &&
      box.top < window.innerHeight &&
      box.bottom > 0
    )
  })
  if (!visible) {
    const maxY = await page.evaluate(() =>
      Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
    )
    await jumpScroll(page, maxY)
  }
  await page.waitForTimeout(350)
}

async function shotSet(page, width, height) {
  await page.setViewportSize({ width, height })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await prepare(page)
  await jumpScroll(page, 0)
  await scrollToSel(page, '#megoldas', width >= 900 ? 160 : 40)
  await page.waitForTimeout(900)
  await saveShot(page, `solution_${width}x${height}.png`)
  await scrollToSel(page, '#ajanlatkero-minta')
  await saveShot(page, `tryit_${width}x${height}.png`)
  await scrollProcessMid(page)
  await saveShot(page, `process_${width}x${height}.png`)
  await scrollToSel(page, '#munkaim')
  await saveShot(page, `work_${width}x${height}.png`)
  await scrollContactEnd(page)
  await saveShot(page, `contact_end_${width}x${height}.png`)
}

function encodeMp4(src, dest) {
  const attempts = [
    ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '28', '-movflags', '+faststart', '-an'],
    ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '32', '-movflags', '+faststart', '-an'],
    [
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-preset',
      'medium',
      '-crf',
      '34',
      '-vf',
      'fps=20',
      '-movflags',
      '+faststart',
      '-an',
    ],
  ]
  for (const args of attempts) {
    const tmp = `${dest}.tmp.mp4`
    const result = spawnSync('ffmpeg', ['-y', '-i', src, ...args, tmp], { stdio: 'inherit' })
    if (result.status === 0 && existsSync(tmp)) {
      renameSync(tmp, dest)
      const size = statSync(dest).size
      console.log(`encoded ${dest} ${(size / 1024 / 1024).toFixed(2)} MB`)
      if (size <= MAX_MP4) return true
    } else if (existsSync(tmp)) {
      unlinkSync(tmp)
    }
  }
  return existsSync(dest) && statSync(dest).size <= MAX_MP4
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
  const steps = width >= 900 ? 28 : 24
  for (let i = 1; i <= steps; i += 1) {
    await page.evaluate(
      ({ next, total, end }) => {
        const y = Math.round((next / total) * end)
        if (window.__lenis?.scrollTo) window.__lenis.scrollTo(y, { immediate: true, force: true })
        else window.scrollTo(0, y)
      },
      { next: i, total: steps, end: maxY },
    )
    await page.waitForTimeout(width >= 900 ? 180 : 160)
  }
  await page.waitForTimeout(500)
  const video = page.video()
  await page.close()
  await context.close()
  if (!video) throw new Error(`no video for ${destName}`)
  const src = await video.path()
  const dest = join(ARTIFACTS, destName)
  const ok = encodeMp4(src, dest)
  try {
    if (src && existsSync(src) && src !== dest) unlinkSync(src)
  } catch {
    // source already consumed
  }
  if (!ok) {
    const size = existsSync(dest) ? statSync(dest).size : 0
    throw new Error(`${destName} is ${(size / 1024 / 1024).toFixed(2)} MB (limit 6 MB)`)
  }
  copyFileSync(dest, join(DOCS, destName))
  console.log(`wrote ${dest}`)
}

async function run() {
  const killer = setTimeout(() => {
    console.error('capture timed out after 360s')
    process.exit(1)
  }, 360000)

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
    await context.close()
    await recordScroll(browser, 390, 844, 'scroll_390x844.mp4')
    await recordScroll(browser, 1440, 900, 'scroll_1440x900.mp4')
    await browser.close()
    for (const name of [
      'scroll_390x844.mp4',
      'scroll_1440x900.mp4',
      'solution_1440x900.png',
      'solution_390x844.png',
      'tryit_1440x900.png',
      'tryit_390x844.png',
      'process_1440x900.png',
      'process_390x844.png',
      'work_1440x900.png',
      'work_390x844.png',
      'contact_end_1440x900.png',
      'contact_end_390x844.png',
    ]) {
      console.log(`artifact ${join(ARTIFACTS, name)}`)
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
