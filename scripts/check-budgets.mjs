import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const htmlPath = path.join(dist, 'index.html')

const BUDGETS = {
  entryJs: 72 * 1024,
  allJs: 160 * 1024,
  css: 9.2 * 1024,
  fonts: 120 * 1024,
  preloadFonts: 60 * 1024,
  three: 140 * 1024,
  viewManager: 6 * 1024,
  cCode: 3 * 1024,
  cDataEach: 8 * 1024,
  cDataTotal: 24 * 1024,
  total3d: 240 * 1024,
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

function is3dJs(file) {
  return /(^|\/)three[^/]*\.js$/.test(file.replaceAll('\\', '/'))
}

function chunkKind(file) {
  const base = path.basename(file)
  if (base.startsWith('three-view-')) return 'view'
  if (base.startsWith('three-c-pi-')) return 'c-pi'
  if (base.startsWith('three-c-pcb-')) return 'c-pcb'
  if (base.startsWith('three-c-sw-')) return 'c-sw'
  if (base.startsWith('three-c-')) return 'c'
  if (base.startsWith('three-boot-')) return 'boot'
  if (base.startsWith('three-')) return 'three'
  return 'other'
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
const pageJs = allJs.filter((file) => !is3dJs(file))
const threeJs = allJs.filter(is3dJs)
const allCss = cssFiles.size ? [...cssFiles] : walk(dist, (file) => file.endsWith('.css'))
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
const pageJsGzip = sum(pageJs, gzipSize)
const threeJsGzip = sum(threeJs, gzipSize)
const cssGzip = sum(allCss, gzipSize)
const fontsRaw = sum(fontFiles, fileSize)
const preloadRaw = sum([...preloadFonts], fileSize)

const byKind = {}
for (const row of threeJsGzip.rows) {
  const kind = chunkKind(row.file)
  byKind[kind] = (byKind[kind] ?? 0) + row.size
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(2)} KB`
}

const checks = [
  ['Entry JS (gzip)', entryJsGzip.total, BUDGETS.entryJs],
  ['Page JS without 3D (gzip)', pageJsGzip.total, BUDGETS.allJs],
  ['CSS (gzip)', cssGzip.total, BUDGETS.css],
  ['Fonts total (raw)', fontsRaw.total, BUDGETS.fonts],
  ['Preload fonts (raw)', preloadRaw.total, BUDGETS.preloadFonts],
]

if (threeJs.length > 0) {
  checks.push(['three chunk (gzip)', byKind.three ?? 0, BUDGETS.three])
  checks.push(['view manager (gzip)', byKind.view ?? 0, BUDGETS.viewManager])
  checks.push(['C code (gzip)', byKind.c ?? 0, BUDGETS.cCode])
  checks.push(['C data pi (gzip)', byKind['c-pi'] ?? 0, BUDGETS.cDataEach])
  checks.push(['C data pcb (gzip)', byKind['c-pcb'] ?? 0, BUDGETS.cDataEach])
  checks.push(['C data sw (gzip)', byKind['c-sw'] ?? 0, BUDGETS.cDataEach])
  const cDataTotal = (byKind['c-pi'] ?? 0) + (byKind['c-pcb'] ?? 0) + (byKind['c-sw'] ?? 0)
  checks.push(['C data total (gzip)', cDataTotal, BUDGETS.cDataTotal])
  const app3d =
    threeJsGzip.total -
    (byKind.three ?? 0)
  checks.push(
    [
      '3D app without vendor (gzip)',
      app3d,
      BUDGETS.viewManager + BUDGETS.cCode + BUDGETS.cDataTotal,
    ],
  )
  checks.push(['3D total (gzip)', threeJsGzip.total, BUDGETS.total3d])
}

console.log('\nBudget check (gzip level 9 for JS/CSS, raw bytes for fonts)\n')
console.log('| Asset | Size | Budget | Status |')
console.log('| --- | ---: | ---: | --- |')

let failed = false
for (const [label, size, budget] of checks) {
  const ok = size <= budget
  if (!ok) failed = true
  console.log(`| ${label} | ${kb(size)} (${size} B) | ${kb(budget)} | ${ok ? 'OK' : 'FAIL'} |`)
}

console.log('\nEntry JS files:')
for (const row of entryJsGzip.rows) console.log(`  ${row.file}: ${kb(row.size)} gzip`)
console.log('Page JS files (no 3D):')
for (const row of pageJsGzip.rows) console.log(`  ${row.file}: ${kb(row.size)} gzip`)
console.log('3D JS files:')
for (const row of threeJsGzip.rows) console.log(`  ${row.file}: ${kb(row.size)} gzip (${chunkKind(row.file)})`)
console.log('CSS files:')
for (const row of cssGzip.rows) console.log(`  ${row.file}: ${kb(row.size)} gzip`)
console.log('Font files:')
for (const row of fontsRaw.rows) console.log(`  ${row.file}: ${kb(row.size)}`)
console.log('Preload fonts:')
for (const row of preloadRaw.rows) console.log(`  ${row.file}: ${kb(row.size)}`)

for (const file of entryJs) {
  const text = fs.readFileSync(file, 'utf8')
  if (text.includes('WebGLRenderer') || /from["']three["']/.test(text)) {
    console.error(`\nEntry chunk contains three: ${path.relative(dist, file)}`)
    failed = true
  }
  if (/from\s*["']\.\/three-/.test(text) || /from\s*["'][^"']*three-view/.test(text)) {
    console.error(`\nEntry chunk statically imports a 3D chunk: ${path.relative(dist, file)}`)
    failed = true
  }
}

if (failed) {
  console.error('\nBudget check failed.')
  process.exit(1)
}

console.log('\nBudget check passed.')
