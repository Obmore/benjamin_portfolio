import { gzipSync } from 'node:zlib'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const assetsDir = join(process.cwd(), 'dist', 'assets')
const JS_LIMIT = 125 * 1024
const CSS_LIMIT = 10 * 1024

if (!existsSync(assetsDir)) {
  console.error('dist/assets missing. Run npm run build first.')
  process.exit(1)
}

let js = 0
let css = 0
const rows = []

for (const name of readdirSync(assetsDir)) {
  const buf = readFileSync(join(assetsDir, name))
  const gz = gzipSync(buf).length
  rows.push({ name, raw: buf.length, gzip: gz })
  if (name.endsWith('.js')) js += gz
  if (name.endsWith('.css')) css += gz
}

for (const row of rows.sort((a, b) => b.gzip - a.gzip)) {
  console.log(
    `${row.name}\traw ${row.raw} B\tgzip ${(row.gzip / 1024).toFixed(1)} KB`,
  )
}

console.log(
  `\nJS gzip ${(js / 1024).toFixed(1)} KB (limit ${(JS_LIMIT / 1024).toFixed(0)} KB, baseline 122.7 KB)`,
)
console.log(
  `CSS gzip ${(css / 1024).toFixed(1)} KB (limit ${(CSS_LIMIT / 1024).toFixed(0)} KB, baseline 6.5 KB)`,
)

let failed = false
if (js > JS_LIMIT) {
  console.error('JS gzip exceeds budget')
  failed = true
}
if (css > CSS_LIMIT) {
  console.error('CSS gzip exceeds budget')
  failed = true
}

process.exit(failed ? 1 : 0)
