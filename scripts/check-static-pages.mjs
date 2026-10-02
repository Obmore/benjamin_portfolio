import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const notFoundPath = path.join(dist, '404.html')
const redirectPath = path.join(dist, 'megrendelo/index.html')

const errors = []

function read(filePath) {
  if (!fs.existsSync(filePath)) {
    errors.push(`Missing ${path.relative(root, filePath)}`)
    return ''
  }
  return fs.readFileSync(filePath, 'utf8')
}

function mustInclude(label, html, snippet) {
  if (!html.includes(snippet)) errors.push(`${label}: missing ${JSON.stringify(snippet)}`)
}

function mustNotInclude(label, html, snippet) {
  if (html.includes(snippet)) errors.push(`${label}: must not contain ${JSON.stringify(snippet)}`)
}

function count(html, re) {
  return [...html.matchAll(re)].length
}

const notFound = read(notFoundPath)
const redirect = read(redirectPath)

if (redirect) {
  mustInclude('megrendelo', redirect, '<meta name="robots" content="noindex" />')
  mustInclude(
    'megrendelo',
    redirect,
    '<link rel="canonical" href="https://ottbenjamin.hu/megrendeles/" />',
  )
  mustInclude('megrendelo', redirect, '<meta http-equiv="refresh" content="0; url=/megrendeles/" />')
  mustInclude(
    'megrendelo',
    redirect,
    "location.replace('/megrendeles/' + location.search + location.hash)",
  )
  mustInclude('megrendelo', redirect, 'Tovább a megrendeléshez')
  mustInclude('megrendelo', redirect, 'href="/megrendeles/"')
  mustInclude('megrendelo', redirect, '<meta name="color-scheme" content="light" />')
  if (count(redirect, /rel="canonical"/g) !== 1) {
    errors.push('megrendelo: canonical must appear exactly once')
  }
  if (count(redirect, /<form\b/gi) !== 0) {
    errors.push('megrendelo: must not contain a form')
  }
}

if (notFound) {
  mustInclude('404', notFound, '<meta name="robots" content="noindex" />')
  mustInclude('404', notFound, '<meta name="color-scheme" content="light" />')
  mustInclude('404', notFound, 'Ez az oldal nem található.')
  mustInclude('404', notFound, 'This page could not be found.')
  mustInclude('404', notFound, 'href="/"')
  mustInclude('404', notFound, 'Vissza a főoldalra')
  mustInclude('404', notFound, "location.replace('/megrendeles/' + location.search + location.hash)")
  mustInclude('404', notFound, "'/megrendelo'")
  mustInclude('404', notFound, "'/megrendelés'")
  mustInclude('404', notFound, "'/rendeles'")
  mustNotInclude('404', notFound, 'href="/megrendeles/"')
  mustNotInclude('404', notFound, 'href="/megrendeles"')
  mustNotInclude('404', notFound, '<form')
  mustNotInclude('404', notFound, '<input')
  mustNotInclude('404', notFound, '<textarea')
  mustNotInclude('404', notFound, '<select')
  mustNotInclude('404', notFound, 'gtag')
  mustNotInclude('404', notFound, 'googletagmanager')
  mustNotInclude('404', notFound, 'bendzsiott1998@gmail.com')
  const external = [...notFound.matchAll(/https?:\/\/[^\s"'<>]+/gi)].map((match) => match[0])
  if (external.length > 0) {
    errors.push(`404: unexpected external URL ${JSON.stringify(external)}`)
  }
  if (Buffer.byteLength(notFound, 'utf8') > 16 * 1024) {
    errors.push(`404: file is ${Buffer.byteLength(notFound, 'utf8')} B; keep it small (≤ 16 KB)`)
  }
}

if (redirect && Buffer.byteLength(redirect, 'utf8') > 8 * 1024) {
  errors.push(
    `megrendelo: file is ${Buffer.byteLength(redirect, 'utf8')} B; keep it small (≤ 8 KB)`,
  )
}

const mainHtmlPath = path.join(dist, 'index.html')
const mainHtml = read(mainHtmlPath)
if (mainHtml) {
  const htmlDir = path.dirname(mainHtmlPath)
  const entryFiles = new Set()
  for (const match of mainHtml.matchAll(/<(?:script|link)\b[^>]*>/gi)) {
    const tag = match[0]
    const src = tag.match(/\bsrc="([^"]+)"/)?.[1]
    const href = tag.match(/\bhref="([^"]+)"/)?.[1]
    const rel = tag.match(/\brel="([^"]+)"/)?.[1]?.toLowerCase() ?? ''
    const url = src ?? ((rel === 'stylesheet' || rel === 'modulepreload') ? href : null)
    if (!url) continue
    const clean = url.split('?')[0].split('#')[0]
    const file = clean.startsWith('/') ? path.join(dist, clean.slice(1)) : path.join(htmlDir, clean)
    if (fs.existsSync(file)) entryFiles.add(file)
  }
  const banned = [
    'Ez az oldal nem található.',
    'This page could not be found.',
    'Vissza a főoldalra',
    'Hiba 404',
    'Tovább a megrendeléshez',
  ]
  for (const file of entryFiles) {
    const text = fs.readFileSync(file, 'utf8')
    for (const snippet of banned) {
      if (text.includes(snippet)) {
        errors.push(
          `main entry ${path.relative(dist, file)} must not contain 404/redirect copy ${JSON.stringify(snippet)}`,
        )
      }
    }
  }
}

if (errors.length > 0) {
  console.error('Static pages check failed:\n')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('Static pages check passed.')
