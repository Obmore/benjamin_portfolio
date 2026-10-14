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
const order = read(orderPath).replaceAll('&nbsp;Ft', ' Ft')
const orderSource = read(path.join(root, 'megrendeles/index.html'))

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
  mustNotInclude('main', main, 'VITE_SHOW_ORDER_LINK')
}

if (order) {
  // The package page is public and indexable since the customer-facing release.
  mustNotInclude('megrendeles', order, '<meta name="robots"')
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
  mustInclude('megrendeles', order, 'mailto:ott.benjamin.ev@ottbenjamin.hu?subject=Megrendel%C3%A9s')
  mustInclude('megrendeles', order, '129&nbsp;000 Ft egyszeri díj.')
  mustInclude('megrendeles', order, 'Üzemeltetés kérésre havi 4&nbsp;900 Ft.')
  mustInclude('megrendeles', order, 'Egyedi webes megoldás')
  mustNotInclude('megrendeles', order, 'megrendeles@ottbenjamin.hu')
  mustNotInclude('megrendeles', order, '59 000')
  mustNotInclude('megrendeles', order, '59&nbsp;000')
  mustNotInclude('megrendeles', order, 'alanyi adómentes')
  mustNotInclude('megrendeles', order, 'Opció: üzemeltetés')
  mustNotInclude('megrendeles', order, '4&nbsp;900 Ft/hó')
  mustNotInclude('megrendeles', order, 'Két munkanapon')
  mustInclude('megrendeles', order, 'href="/adatkezeles/"')
  mustNotInclude('megrendeles', order, '<form')
  // Local inquiry composer approved in the October follow-up. It has no submit endpoint.
  mustInclude('megrendeles', order, 'id="mg-service"')
  mustInclude('megrendeles', order, 'id="mg-description"')
  mustNotInclude('megrendeles', order, 'data-subject')
  mustNotInclude('megrendeles', order, 'Aj%C3%A1nlatk%C3%A9r%C3%A9s')
  mustInclude('megrendeles', order, 'Kimásolva')
  mustInclude(
    'megrendeles',
    order,
    'A domain díja külön fizetendő, és a domain az Ön nevére szól.',
  )
  mustInclude(
    'megrendeles',
    order,
    'alapvető keresőbeállítás: oldalcím és leírás a Google-találatokhoz, valamint az',
  )
  mustInclude(
    'megrendeles',
    order,
    'Általában három héten belül elkészül, miután megkaptam a szövegeket és a fotókat.',
  )
  mustInclude('megrendeles', order, 'Írjon nekem e-mailt, és hamarosan válaszolok.')
  mustNotInclude('megrendeles', order, 'mg-kicker')
  mustNotInclude('megrendeles', order, 'a domain külön költség, és az Ön nevére szól')
  if (count(order, /ott\.benjamin\.ev@ottbenjamin\.hu/g) !== 3) {
    errors.push('megrendeles: business e-mail address must appear exactly 3 times')
  }
  if (count(order, /class="mg-vat">AAM \(áfamentes\)</g) !== 7) {
    errors.push('megrendeles: each of the seven amounts needs its „AAM (áfamentes)” label')
  }
  if (count(order, /129(?:&nbsp;|\u00a0| )000 Ft egyszeri díj\./g) !== 1) {
    errors.push('megrendeles: „129 000 Ft egyszeri díj.” must appear exactly once')
  }
  if (!/id="mg-copy"[^>]*\bhidden\b/.test(order) && !/<button[^>]*\bhidden\b[^>]*id="mg-copy"/.test(order)) {
    errors.push('megrendeles: Másolás button must be hidden in the HTML')
  }

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

if (orderSource) {
  for (const key of ['orderForm', 'orderFormSheet', 'introSite', 'hosting', 'hostingWithEdits']) {
    mustInclude('megrendeles source', orderSource, `{{huf:${key}}}`)
  }
  if (/\d{1,3}&nbsp;\d{3}&nbsp;Ft/.test(orderSource)) {
    errors.push('megrendeles source: write prices as {{huf:…}} placeholders, not literals')
  }
}

const assetsDir = path.join(dist, 'assets')
if (fs.existsSync(assetsDir)) {
  const mainJs = fs
    .readdirSync(assetsDir)
    .filter((name) => name.endsWith('.js') && !name.startsWith('megrendeles-'))
    .map((name) => fs.readFileSync(path.join(assetsDir, name), 'utf8'))
    .join('\n')
  mustInclude('main js', mainJs, '/megrendeles/')
  mustNotInclude('main js', mainJs, 'VITE_SHOW_ORDER_LINK')
  mustNotInclude('main js', mainJs, 'SHOW_ORDER_LINK')
  mustNotInclude('main js', mainJs, '59 000')
  mustNotInclude('main js', mainJs, '59000')
  mustNotInclude('main js', mainJs, 'Bemutatkozó oldal vállalkozásoknak')
  // Since the customer-facing release the home page shows the packages and prices
  // (#csomagok); e2e/customer-site.spec.ts checks that they match this page.
  mustInclude('main js', mainJs, 'Egyedi webes megoldás')
  mustInclude('main js', mainJs, 'AAM (áfamentes)')

  const orderJs = fs
    .readdirSync(assetsDir)
    .filter((name) => name.startsWith('megrendeles-') && name.endsWith('.js'))
    .map((name) => fs.readFileSync(path.join(assetsDir, name), 'utf8'))
    .join('\n')
  mustInclude('megrendeles js', orderJs, 'E-mail-cím a vágólapra másolva')
  mustNotInclude('megrendeles js', orderJs, 'Az e-mail-cím a vágólapra került.')
  mustNotInclude('megrendeles js', orderJs, 'Aj%C3%A1nlatk%C3%A9r%C3%A9s')
}

function walkFiles(dir) {
  const out = []
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walkFiles(full))
    else out.push(full)
  }
  return out
}

function textContent(filePath) {
  const buf = fs.readFileSync(filePath)
  if (buf.includes(0)) return ''
  return buf.toString('utf8')
}

const distText = walkFiles(dist)
  .map((filePath) => textContent(filePath))
  .join('\n')
const distNormalized = distText.replaceAll('\u00a0', ' ').replaceAll('&nbsp;', ' ')
if ((distNormalized.match(/59 000/g) ?? []).length !== 0) {
  errors.push('dist: must not contain „59 000”')
}
if ((distText.match(/alanyi adómentes/g) ?? []).length !== 0) {
  errors.push('dist: must not contain „alanyi adómentes”')
}
if ((order.replaceAll('\u00a0', ' ').replaceAll('&nbsp;', ' ').match(/129 000 Ft egyszeri díj\./g) ?? []).length !== 1) {
  errors.push('megrendeles: normalized „129 000 Ft egyszeri díj.” must appear exactly once')
}

if (errors.length > 0) {
  console.error('Megrendelés page check failed:\n')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('Megrendelés page check passed.')
