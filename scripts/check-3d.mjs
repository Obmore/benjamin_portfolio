import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const FORBIDDEN = [/\brollin\b/i, /get in touch/i]

const errors = []

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

const dataFiles = walk(path.join(root, 'src/three/generated'), (file) => file.endsWith('.data.ts'))
const svgFiles = walk(path.join(root, 'public/3d'), (file) => file.endsWith('.svg'))

if (dataFiles.length === 0) {
  errors.push('no baked data files in src/three/generated')
}

for (const file of [...dataFiles, ...svgFiles]) {
  const license = `${file}.license.json`
  if (!fs.existsSync(license)) {
    errors.push(`missing license: ${path.relative(root, license)}`)
    continue
  }
  const json = JSON.parse(fs.readFileSync(license, 'utf8'))
  if (json.license !== 'saját') {
    errors.push(`${path.relative(root, license)} must set license to "saját"`)
  }
}

function scan(file) {
  const text = fs.readFileSync(file, 'utf8')
  for (const re of FORBIDDEN) {
    if (re.test(text)) errors.push(`${path.relative(root, file)} matches ${re}`)
  }
}

for (const file of svgFiles) scan(file)
for (const file of walk(path.join(root, 'src/three'), (f) => /\.(ts|tsx)$/.test(f) && !f.endsWith('.data.ts'))) {
  scan(file)
}

const distHtml = path.join(root, 'dist/index.html')
if (fs.existsSync(distHtml)) {
  const html = fs.readFileSync(distHtml, 'utf8')
  if (/three[^"' ]*\.js/.test(html) && /modulepreload[^>]+three/.test(html)) {
    errors.push('index.html modulepreloads a three chunk')
  }
  if (html.includes('3d=force') || html.includes('3d=debug')) {
    errors.push('QA 3d query appears in index.html')
  }
  const assets = walk(path.join(root, 'dist/assets'), (f) => f.endsWith('.js'))
  for (const file of assets) {
    const text = fs.readFileSync(file, 'utf8')
    if (text.includes('3d=force') || text.includes('3d=debug')) {
      errors.push(`QA switch leaked into ${path.relative(root, file)}`)
    }
  }
}

if (errors.length > 0) {
  console.error('3D check failed:\n')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`3D check passed (${dataFiles.length} data files, ${svgFiles.length} posters).`)
