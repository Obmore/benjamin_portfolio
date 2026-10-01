import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const htmlPath = path.join(dist, 'index.html')

const BUDGETS = {
  entryJs: 90 * 1024,
  allJs: 160 * 1024,
  css: 15 * 1024,
  fonts: 120 * 1024,
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

function resolveFromDist(href) {
  const clean = href.split('?')[0].split('#')[0]
  if (clean.startsWith('/')) return path.join(dist, clean.slice(1))
  return path.join(dist, clean)
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

if (!fs.existsSync(htmlPath)) {
  console.error('dist/index.html missing. Run npm run build first.')
  process.exit(1)
}

const html = fs.readFileSync(htmlPath, 'utf8')
const entryJs = new Set()
const cssFiles = new Set()
const preloadFonts = new Set()

for (const match of html.matchAll(/<script\b[^>]*>/gi)) {
  const a = attrs(match[0])
  if (a.src) entryJs.add(resolveFromDist(a.src))
}

for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
  const a = attrs(match[0])
  const rel = (a.rel ?? '').toLowerCase()
  if (rel === 'modulepreload' && a.href) entryJs.add(resolveFromDist(a.href))
  if (rel === 'stylesheet' && a.href) cssFiles.add(resolveFromDist(a.href))
  if (rel === 'preload' && a.as === 'font' && a.href) preloadFonts.add(resolveFromDist(a.href))
}

const allJs = walk(path.join(dist, 'assets'), (file) => file.endsWith('.js'))
const allCss = cssFiles.size
  ? [...cssFiles]
  : walk(dist, (file) => file.endsWith('.css'))
const fontFiles = walk(path.join(dist, 'fonts'), (file) => file.endsWith('.woff2'))

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

const entryJsGzip = sum([...entryJs], gzipSize)
const allJsGzip = sum(allJs, gzipSize)
const cssGzip = sum(allCss, gzipSize)
const fontsRaw = sum(fontFiles, fileSize)
const preloadRaw = sum([...preloadFonts], fileSize)

function kb(bytes) {
  return `${(bytes / 1024).toFixed(2)} KB`
}

const checks = [
  ['Entry JS (gzip)', entryJsGzip.total, BUDGETS.entryJs],
  ['All JS (gzip)', allJsGzip.total, BUDGETS.allJs],
  ['CSS (gzip)', cssGzip.total, BUDGETS.css],
  ['Fonts total (raw)', fontsRaw.total, BUDGETS.fonts],
  ['Preload fonts (raw)', preloadRaw.total, BUDGETS.preloadFonts],
]

console.log('\nBudget check (gzip level 9 for JS/CSS, raw bytes for fonts)\n')
console.log(
  '| Asset | Size | Budget | Status |',
)
console.log('| --- | ---: | ---: | --- |')

let failed = false
for (const [label, size, budget] of checks) {
  const ok = size <= budget
  if (!ok) failed = true
  console.log(
    `| ${label} | ${kb(size)} (${size} B) | ${kb(budget)} | ${ok ? 'OK' : 'FAIL'} |`,
  )
}

console.log('\nEntry JS files:')
for (const row of entryJsGzip.rows) console.log(`  ${row.file}: ${kb(row.size)} gzip`)
console.log('All JS files:')
for (const row of allJsGzip.rows) console.log(`  ${row.file}: ${kb(row.size)} gzip`)
console.log('CSS files:')
for (const row of cssGzip.rows) console.log(`  ${row.file}: ${kb(row.size)} gzip`)
console.log('Font files:')
for (const row of fontsRaw.rows) console.log(`  ${row.file}: ${kb(row.size)}`)
console.log('Preload fonts:')
for (const row of preloadRaw.rows) console.log(`  ${row.file}: ${kb(row.size)}`)

if (failed) {
  console.error('\nBudget check failed.')
  process.exit(1)
}

console.log('\nBudget check passed.')
