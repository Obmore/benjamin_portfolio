import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const SITE = 'https://ottbenjamin.hu'
const EMAIL = 'ott.benjamin.ev@ottbenjamin.hu'
const errors = []

function walk(dir, predicate) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(full, predicate)
    return predicate(full) ? [full] : []
  })
}

const rel = (file) => path.relative(root, file).replaceAll('\\', '/')
const read = (file) => fs.readFileSync(file, 'utf8')
const isNoindex = (html) => /<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html)

if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('dist/index.html missing. Run npm run build first.')
  process.exit(1)
}

// One contact address in everything the site itself serves. The Trendo demo is a separate app.
const served = walk(dist, (file) => /\.(html|js|xml|txt)$/.test(file))
  .filter((file) => !rel(file).startsWith('dist/demos/') && !rel(file).endsWith('third-party-notices.txt'))
for (const file of served) {
  for (const [address] of read(file).matchAll(/[\w.%+-]+@[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}\b/gi)) {
    if (address.toLowerCase() !== EMAIL) errors.push(`${rel(file)}: unexpected e-mail address ${address}`)
  }
}

// The sitemap lists every indexable page and nothing else.
const sitemapPath = path.join(dist, 'sitemap.xml')
const robots = fs.existsSync(path.join(dist, 'robots.txt')) ? read(path.join(dist, 'robots.txt')) : ''
if (!robots.includes(`Sitemap: ${SITE}/sitemap.xml`)) errors.push('robots.txt: missing Sitemap line')
if (!fs.existsSync(sitemapPath)) {
  errors.push('dist/sitemap.xml missing')
} else {
  const locs = [...read(sitemapPath).matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
  if (new Set(locs).size !== locs.length) errors.push('sitemap: duplicate <loc>')
  for (const loc of locs) {
    if (!loc.startsWith(`${SITE}/`) || !loc.endsWith('/')) {
      errors.push(`sitemap: ${loc} must be an absolute ${SITE}/…/ URL`)
      continue
    }
    const page = path.join(dist, loc.slice(SITE.length), 'index.html')
    if (!fs.existsSync(page)) errors.push(`sitemap: ${loc} has no page in dist (404)`)
    else if (isNoindex(read(page))) errors.push(`sitemap: ${loc} is noindex`)
  }
  for (const page of walk(dist, (file) => path.basename(file) === 'index.html')) {
    if (isNoindex(read(page))) continue
    const urlPath = `/${path.relative(dist, path.dirname(page)).replaceAll('\\', '/')}/`.replace(/^\/\/$/, '/')
    if (!locs.includes(SITE + urlPath)) errors.push(`sitemap: indexable page ${urlPath} is missing`)
  }
}

// No colours beyond the design tokens and the reviewed palette that existed before (scripts/color-allowlist.json).
const allowed = new Set(JSON.parse(read(path.join(root, 'scripts/color-allowlist.json'))))
const styled = [
  ...walk(path.join(root, 'src'), (file) => /\.(css|ts|tsx)$/.test(file)),
  ...walk(root, (file) => file.endsWith('index.html') && !/[\\/](node_modules|dist|tmp|public[\\/]demos|\.claude|test-results|playwright-report)[\\/]/.test(file)),
  path.join(root, 'public/404.html'),
]
for (const file of styled) {
  for (const [color] of read(file).matchAll(/#[0-9a-f]{3,8}\b/gi)) {
    if (!allowed.has(color.toLowerCase())) errors.push(`${rel(file)}: colour ${color} is not a design token or reviewed colour`)
  }
}

if (errors.length > 0) {
  console.error('Site check failed:\n')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('Site check passed.')
