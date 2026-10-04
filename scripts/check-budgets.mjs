import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const mainHtmlPath = path.join(dist, 'index.html')
const orderHtmlPath = path.join(dist, 'megrendeles/index.html')

const MAIN_BUDGETS = {
  entryJs: 73511,
  allJs: 160 * 1024,
  css: 9420,
  fonts: 120 * 1024,
  preloadFonts: 60 * 1024,
  glb: 40 * 1024,
  webp: 50 * 1024,
}

const ORDER_BUDGETS = {
  js: 15 * 1024,
  css: 10 * 1024,
  preloadFonts: 60 * 1024,
}

function gzipSize(filePath) {
  const buf = fs.readFileSync(filePath)
  return zlib.gzipSync(buf, { level: 9 }).length
}

function fileSize(filePath) {
  return fs.statSync(filePath).size
}

function attrs(tag) {
  const out = {}
  for (const match of tag.matchAll(/([a-zA-Z_:][\w:.-]*)=(?:"([^"]*)"|'([^']*)')/g)) {
    out[match[1]] = match[2] ?? match[3] ?? ''
  }
  return out
}

function collectFromHtml(html, htmlFilePath) {
  const htmlDir = path.dirname(htmlFilePath)
  const entryJs = new Set()
  const cssFiles = new Set()
  const preloadFonts = new Set()
  const preloadImages = []

  const resolveHref = (href) => {
    const clean = href.split('?')[0].split('#')[0]
    if (clean.startsWith('/')) return path.join(dist, clean.slice(1))
    return path.join(htmlDir, clean)
  }

  for (const match of html.matchAll(/<script\b[^>]*>/gi)) {
    const a = attrs(match[0])
    if (a.src) entryJs.add(path.normalize(resolveHref(a.src)))
  }

  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const a = attrs(match[0])
    const rel = (a.rel ?? '').toLowerCase()
    if (rel === 'modulepreload' && a.href) entryJs.add(path.normalize(resolveHref(a.href)))
    if (rel === 'stylesheet' && a.href) cssFiles.add(path.normalize(resolveHref(a.href)))
    if (rel === 'preload' && a.as === 'font' && a.href) {
      preloadFonts.add(path.normalize(resolveHref(a.href)))
    }
    if (rel === 'preload' && a.as === 'image') preloadImages.push(a)
  }

  return { entryJs, cssFiles, preloadFonts, preloadImages }
}

function walk(dir, predicate) {
  if (!fs.existsSync(dir)) return []
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full, predicate))
    else if (predicate(full)) out.push(full)
  }
  return out
}

function sum(files, measurer) {
  let total = 0
  const rows = []
  for (const file of files) {
    if (!fs.existsSync(file)) {
      console.error(`Missing file: ${file}`)
      process.exit(1)
    }
    const size = measurer(file)
    total += size
    rows.push({ file: path.relative(dist, file), size })
  }
  return { total, rows }
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(2)} KB`
}

function printRows(title, rows, unit = 'gzip') {
  console.log(`${title}:`)
  if (rows.length === 0) {
    console.log('  (none)')
    return
  }
  for (const row of rows) console.log(`  ${row.file}: ${kb(row.size)} ${unit}`)
}

function isLazyDesktopJs(file) {
  const base = path.basename(file)
  return /^(three|gsap|hero3d|hero-scroll|detect-gpu|after-lcp|lcp)(-|$)/.test(base)
}

if (!fs.existsSync(mainHtmlPath)) {
  console.error('dist/index.html missing. Run npm run build first.')
  process.exit(1)
}

if (!fs.existsSync(orderHtmlPath)) {
  console.error('dist/megrendeles/index.html missing. Run npm run build first.')
  process.exit(1)
}

const mainHtml = fs.readFileSync(mainHtmlPath, 'utf8')
const orderHtml = fs.readFileSync(orderHtmlPath, 'utf8')
const main = collectFromHtml(mainHtml, mainHtmlPath)
const order = collectFromHtml(orderHtml, orderHtmlPath)

const mainJsGzip = sum([...main.entryJs], gzipSize)
const mainCssGzip = sum([...main.cssFiles], gzipSize)
const orderJsGzip = sum([...order.entryJs], gzipSize)
const orderCssGzip = sum([...order.cssFiles], gzipSize)

const allMainJsFiles = walk(path.join(dist, 'assets'), (file) => {
  if (!file.endsWith('.js')) return false
  const base = path.basename(file)
  return !base.startsWith('megrendeles-')
})
const pageJsFiles = allMainJsFiles.filter((file) => !isLazyDesktopJs(file))
const lazyDesktopFiles = allMainJsFiles.filter(isLazyDesktopJs)
const mainAllJsGzip = sum(pageJsFiles, gzipSize)
const lazyDesktopGzip = sum(lazyDesktopFiles, gzipSize)

const fontFiles = walk(path.join(dist, 'fonts'), (file) => file.endsWith('.woff2'))
const fontsRaw = sum(fontFiles, fileSize)
const mainPreloadRaw = sum([...main.preloadFonts], fileSize)
const orderPreloadRaw = sum([...order.preloadFonts], fileSize)

const sharedJs = [...main.entryJs].filter((file) => order.entryJs.has(file))
const sharedCss = [...main.cssFiles].filter((file) => order.cssFiles.has(file))
const unexpectedSharedJs = sharedJs.filter(
  (file) => !path.basename(file).startsWith('modulepreload-polyfill'),
)

let failed = false

if (unexpectedSharedJs.length > 0) {
  failed = true
  console.error(
    `Shared JS chunks between main and /megrendeles/: ${unexpectedSharedJs
      .map((file) => path.relative(dist, file))
      .join(', ')}`,
  )
}

if (sharedCss.length > 0) {
  failed = true
  console.error(
    `Shared CSS chunks between main and /megrendeles/: ${sharedCss
      .map((file) => path.relative(dist, file))
      .join(', ')}`,
  )
}

const glbPath = path.join(dist, 'hero/k1.glb')
const webp1 = path.join(dist, 'hero/k1-p0@1x.webp')
const webp2 = path.join(dist, 'hero/k1-p0@2x.webp')
for (const file of [glbPath, webp1, webp2]) {
  if (!fs.existsSync(file)) {
    failed = true
    console.error(`Missing asset: ${path.relative(dist, file)}`)
  }
}
const glbSize = fs.existsSync(glbPath) ? fileSize(glbPath) : 0
const webp1Size = fs.existsSync(webp1) ? fileSize(webp1) : 0
const webp2Size = fs.existsSync(webp2) ? fileSize(webp2) : 0

const checks = [
  ['Main critical JS closure (gzip-9)', mainJsGzip.total, MAIN_BUDGETS.entryJs],
  ['Main all JS except /megrendeles/ and desktop 3D (gzip)', mainAllJsGzip.total, MAIN_BUDGETS.allJs],
  ['Main CSS (gzip)', mainCssGzip.total, MAIN_BUDGETS.css],
  ['Fonts total (raw)', fontsRaw.total, MAIN_BUDGETS.fonts],
  ['Main preload fonts (raw)', mainPreloadRaw.total, MAIN_BUDGETS.preloadFonts],
  ['/megrendeles/ JS (gzip)', orderJsGzip.total, ORDER_BUDGETS.js],
  ['/megrendeles/ CSS (gzip)', orderCssGzip.total, ORDER_BUDGETS.css],
  ['/megrendeles/ preload fonts (raw)', orderPreloadRaw.total, ORDER_BUDGETS.preloadFonts],
  ['hero GLB (raw)', glbSize, MAIN_BUDGETS.glb],
  ['hero poster 1x webp (raw)', webp1Size, MAIN_BUDGETS.webp],
  ['hero poster 2x webp (raw)', webp2Size, MAIN_BUDGETS.webp],
]

console.log('\nBudget check (gzip level 9 for JS/CSS, raw bytes for fonts/assets)\n')
console.log('| Asset | Size | Budget | Status |')
console.log('| --- | ---: | ---: | --- |')

for (const [label, size, budget] of checks) {
  const ok = size <= budget
  if (!ok) failed = true
  console.log(`| ${label} | ${kb(size)} (${size} B) | ${kb(budget)} | ${ok ? 'OK' : 'FAIL'} |`)
}

console.log(
  `\nLazy desktop 3D chunk (gzip-9, reported, no hard cap): ${kb(lazyDesktopGzip.total)} (${lazyDesktopGzip.total} B)`,
)

console.log('')
printRows('Main entry JS files', mainJsGzip.rows)
printRows('Main page JS files (no three/gsap/hero3d)', mainAllJsGzip.rows)
printRows('Lazy desktop 3D JS files', lazyDesktopGzip.rows)
printRows('Main CSS files', mainCssGzip.rows)
printRows('Main preload fonts', mainPreloadRaw.rows, 'raw')
printRows('/megrendeles/ JS files', orderJsGzip.rows)
printRows('/megrendeles/ CSS files', orderCssGzip.rows)
printRows('/megrendeles/ preload fonts', orderPreloadRaw.rows, 'raw')
printRows('Font files', fontsRaw.rows, 'raw')

if (![...order.preloadFonts].some((file) => file.endsWith('dm-sans-400.woff2'))) {
  failed = true
  console.error('\n/megrendeles/ must preload dm-sans-400.woff2.')
}

const webpPreload = main.preloadImages.filter((a) => (a.href ?? '').includes('k1-p0'))
if (webpPreload.length === 0) {
  failed = true
  console.error('\nMissing webp preload for the desktop hero poster.')
}
for (const a of webpPreload) {
  if (a.media !== '(pointer: fine) and (min-width: 1024px)') {
    failed = true
    console.error(`\nHero webp preload media must be desktop-only, got ${JSON.stringify(a.media)}`)
  }
  if ((a.fetchpriority ?? a.fetchPriority) !== 'high') {
    failed = true
    console.error('\nHero webp preload must use fetchpriority=high.')
  }
}

const srcHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
if (!srcHtml.includes('id="hero-k1-poster-template"')) {
  failed = true
  console.error('\nMobile k1 SVG poster template missing from index.html.')
}

for (const file of main.entryJs) {
  const text = fs.readFileSync(file, 'utf8')
  if (isLazyDesktopJs(file)) {
    console.error(`\nCritical entry preloads deferred 3D chunk: ${path.relative(dist, file)}`)
    failed = true
  }
  if (text.includes('WebGLRenderer') || /from["']three["']/.test(text) || /from["']three\//.test(text)) {
    console.error(`\nEntry chunk contains three: ${path.relative(dist, file)}`)
    failed = true
  }
  if (text.includes('ScrollTrigger') || /from["']gsap["']/.test(text) || /from["']gsap\//.test(text)) {
    console.error(`\nEntry chunk contains gsap: ${path.relative(dist, file)}`)
    failed = true
  }
  if (text.includes('getGPUTier') || text.includes('detect-gpu')) {
    console.error(`\nEntry chunk contains detect-gpu: ${path.relative(dist, file)}`)
    failed = true
  }
  if (/from\s*["'][^"']*(?:hero3d|\/three-|\/gsap-|detect-gpu)/.test(text)) {
    console.error(`\nEntry chunk statically imports a desktop 3D chunk: ${path.relative(dist, file)}`)
    failed = true
  }
}

const srcHero = fs.readFileSync(path.join(root, 'src/components/visuals/HeroVisual.tsx'), 'utf8')
if (srcHero.includes('hero-circuit') || srcHero.includes('hero-signal')) {
  console.error('\nHeroVisual still contains the old 2D circuit.')
  failed = true
}

if (failed) {
  console.error('\nBudget check failed.')
  process.exit(1)
}

console.log('\nBudget check passed.')
