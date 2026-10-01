import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const mainPath = path.join(dist, 'index.html')
const orderPath = path.join(dist, 'megrendeles/index.html')

const errors = []

function read(filePath) {
  if (!fs.existsSync(filePath)) {
    errors.push(`Missing ${path.relative(root, filePath)}`)
    return ''
  }
  return fs.readFileSync(filePath, 'utf8')
}

const main = read(mainPath)
const order = read(orderPath)

function mustInclude(label, html, snippet) {
  if (!html.includes(snippet)) errors.push(`${label}: missing ${JSON.stringify(snippet)}`)
}

function mustNotInclude(label, html, snippet) {
  if (html.includes(snippet)) errors.push(`${label}: must not contain ${JSON.stringify(snippet)}`)
}

function count(html, re) {
  return [...html.matchAll(re)].length
}

if (main) {
  mustInclude('main', main, '<link rel="canonical" href="https://ottbenjamin.hu/" />')
  mustInclude('main', main, '<meta property="og:url" content="https://ottbenjamin.hu/" />')
  mustInclude('main', main, '<title>Ott Benjámin, villamosmérnök és szoftverfejlesztő</title>')
  mustNotInclude('main', main, '/megrendeles/')
  mustNotInclude('main', main, 'VITE_SHOW_ORDER_LINK')
}

if (order) {
  mustInclude('megrendeles', order, '<meta name="robots" content="noindex" />')
  mustInclude(
    'megrendeles',
    order,
    '<link rel="canonical" href="https://ottbenjamin.hu/megrendeles/" />',
  )
  mustInclude(
    'megrendeles',
    order,
    '<meta property="og:url" content="https://ottbenjamin.hu/megrendeles/" />',
  )
  mustInclude('megrendeles', order, '<title>Megrendelés és ajánlatkérés</title>')
  mustInclude('megrendeles', order, 'mailto:bendzsiott1998@gmail.com?subject=Megrendel%C3%A9s')
  mustInclude('megrendeles', order, '59&nbsp;000 Ft')
  mustInclude('megrendeles', order, '4&nbsp;900 Ft/hó')
  mustInclude('megrendeles', order, 'Egyedi webes megoldás')
  mustNotInclude('megrendeles', order, 'megrendeles@ottbenjamin.hu')
  mustNotInclude('megrendeles', order, '149 000')
  mustNotInclude('megrendeles', order, '149&nbsp;000')
  mustNotInclude('megrendeles', order, 'Két munkanapon')
  mustNotInclude('megrendeles', order, 'adatkezeles')
  mustNotInclude('megrendeles', order, '<form')
  mustNotInclude('megrendeles', order, '<input')
  mustNotInclude('megrendeles', order, '<textarea')
  mustNotInclude('megrendeles', order, '<select')

  if (count(order, /rel="canonical"/g) !== 1) {
    errors.push('megrendeles: canonical must appear exactly once')
  }
  if (count(order, /property="og:url"/g) !== 1) {
    errors.push('megrendeles: og:url must appear exactly once')
  }
  if (/src\/main\.tsx/.test(order)) {
    errors.push('megrendeles: must not load the main React entry')
  }
}

if (errors.length > 0) {
  console.error('Megrendelés page check failed:\n')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('Megrendelés page check passed.')
