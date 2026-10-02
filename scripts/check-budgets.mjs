import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const mainHtmlPath = path.join(dist, 'index.html')
const orderHtmlPath = path.join(dist, 'megrendeles/index.html')

const MAIN_BUDGETS = {
  entryJs: 73728,
  allJs: 160 * 1024,
  css: 9420,
  fonts: 120 * 1024,
  preloadFonts: 60 * 1024,
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
  }

  return { entryJs, cssFiles, preloadFonts }
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
const mainAllJsGzip = sum(allMainJsFiles, gzipSize)

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

const checks = [
  ['Main entry JS (gzip)', mainJsGzip.total, MAIN_BUDGETS.entryJs],
  ['Main all JS except /megrendeles/ (gzip)', mainAllJsGzip.total, MAIN_BUDGETS.allJs],
  ['Main CSS (gzip)', mainCssGzip.total, MAIN_BUDGETS.css],
  ['Fonts total (raw)', fontsRaw.total, MAIN_BUDGETS.fonts],
  ['Main preload fonts (raw)', mainPreloadRaw.total, MAIN_BUDGETS.preloadFonts],
  ['/megrendeles/ JS (gzip)', orderJsGzip.total, ORDER_BUDGETS.js],
  ['/megrendeles/ CSS (gzip)', orderCssGzip.total, ORDER_BUDGETS.css],
  ['/megrendeles/ preload fonts (raw)', orderPreloadRaw.total, ORDER_BUDGETS.preloadFonts],
]

console.log('\nBudget check (gzip level 9 for JS/CSS, raw bytes for fonts)\n')
console.log('| Asset | Size | Budget | Status |')
console.log('| --- | ---: | ---: | --- |')

for (const [label, size, budget] of checks) {
  const ok = size <= budget
  if (!ok) failed = true
  console.log(`| ${label} | ${kb(size)} (${size} B) | ${kb(budget)} | ${ok ? 'OK' : 'FAIL'} |`)
}

console.log('')
printRows('Main entry JS files', mainJsGzip.rows)
printRows('Main all JS files (excluding megrendeles-*)', mainAllJsGzip.rows)
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

if (failed) {
  console.error('\nBudget check failed.')
  process.exit(1)
}

console.log('\nBudget check passed.')
