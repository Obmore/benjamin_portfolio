import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replaceAll('\r\n', '\n')
const article = html => {
  const matches = [...html.matchAll(/<article>([\s\S]*?)<\/article>/g)]
  assert.equal(matches.length, 1, 'The notice must have exactly one canonical article')
  return matches[0][1].trim()
}
const source = article(read('adatkezeles/index.html'))
const built = read('dist/adatkezeles/index.html')
const sha = createHash('sha256').update(source).digest('hex')
assert.equal(sha, read('docs/privacy-content.sha256').trim(), 'Review wording changes before updating the privacy fingerprint')
assert.equal(article(built), source, 'The build changed the privacy article')
assert.doesNotMatch(built, /<script\b|<iframe\b|<form\b/i, 'The notice must work without JavaScript or embedded services')
assert.ok(Buffer.byteLength(built) < 16 * 1024, 'Keep the notice small')
assert.ok(read('dist/megrendeles/index.html').includes('href="/adatkezeles/"'), 'Missing order footer link')
console.log(`Privacy source and build match: SHA256 ${sha}`)
