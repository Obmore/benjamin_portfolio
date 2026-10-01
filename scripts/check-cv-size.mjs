import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')

function kbFromBytes(bytes) {
  return Math.round(bytes / 1024)
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

const huBytes = fs.statSync(path.join(root, 'public/cv/Ott_Benjamin_CV_HU.pdf')).size
const enBytes = fs.statSync(path.join(root, 'public/cv/Ott_Benjamin_CV_EN.pdf')).size
const huKb = kbFromBytes(huBytes)
const enKb = kbFromBytes(enBytes)
const huLabel = `PDF · ${huKb} KB`
const enLabel = `PDF · ${enKb} KB`

if (!fs.existsSync(dist)) {
  console.error('dist/ missing. Run npm run build first.')
  process.exit(1)
}

const bundleFiles = walk(dist, (file) => /\.(js|html|css)$/.test(file))
const bundleText = bundleFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n')

const labelRe = /PDF · (\d+) KB/g
const found = new Set()
for (const match of bundleText.matchAll(labelRe)) {
  found.add(Number(match[1]))
}

const allowed = new Set([huKb, enKb])
const unexpected = [...found].filter((n) => !allowed.has(n))

let failed = false

if (!bundleText.includes(huLabel)) {
  console.error(`Displayed HU CV size missing or differs. Expected "${huLabel}" (measured ${huBytes} B).`)
  failed = true
}

if (!bundleText.includes(enLabel)) {
  console.error(`Displayed EN CV size missing or differs. Expected "${enLabel}" (measured ${enBytes} B).`)
  failed = true
}

if (unexpected.length > 0) {
  console.error(
    `Displayed CV size(s) ${unexpected.map((n) => `${n} KB`).join(', ')} differ from measured ${huKb} KB / ${enKb} KB.`,
  )
  failed = true
}

if (failed) {
  process.exit(1)
}

console.log(
  `CV size check passed: HU ${huBytes} B → "${huLabel}", EN ${enBytes} B → "${enLabel}".`,
)
