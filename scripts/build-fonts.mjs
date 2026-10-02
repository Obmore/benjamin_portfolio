import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import dmSansMetrics from '@capsizecss/metrics/dMSans'
import arialMetrics from '@capsizecss/metrics/arial'
import jetBrainsMetrics from '@capsizecss/metrics/jetBrainsMono'
import courierNewMetrics from '@capsizecss/metrics/courierNew'

const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'public/fonts')

const UNICODE_RANGE =
  'U+0000-00FF,U+0131,U+0150-0151,U+0152-0153,U+0170-0171,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191-2193,U+2197,U+2212,U+2215,U+2713,U+FEFF,U+FFFD'

const REQUIRED_BOTH = ['„', '”', '–', '·', '↗', '×', '✓']
const REQUIRED_MONO = [...REQUIRED_BOTH, ...'0123456789', '/']

const FONTS = [
  {
    id: 'dm-sans-400',
    pkg: '@fontsource/dm-sans',
    filePrefix: 'dm-sans',
    weight: '400',
    required: REQUIRED_BOTH,
  },
  {
    id: 'dm-sans-500',
    pkg: '@fontsource/dm-sans',
    filePrefix: 'dm-sans',
    weight: '500',
    required: REQUIRED_BOTH,
  },
  {
    id: 'dm-sans-600',
    pkg: '@fontsource/dm-sans',
    filePrefix: 'dm-sans',
    weight: '600',
    required: REQUIRED_BOTH,
  },
  {
    id: 'jetbrains-mono-400',
    pkg: '@fontsource/jetbrains-mono',
    filePrefix: 'jetbrains-mono',
    weight: '400',
    required: REQUIRED_MONO,
  },
  {
    id: 'jetbrains-mono-500',
    pkg: '@fontsource/jetbrains-mono',
    filePrefix: 'jetbrains-mono',
    weight: '500',
    required: REQUIRED_MONO,
  },
]

const PYTHON = `
import json, sys, tempfile, os
from fontTools.merge import Merger
from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont

def cmap_cps(path):
    font = TTFont(path)
    cps = set()
    for table in font["cmap"].tables:
        cps.update(table.cmap.keys())
    font.close()
    return cps

def parse_unicodes(spec):
    out = []
    for part in spec.split(","):
        part = part.strip()
        if not part:
            continue
        token = part[2:] if part.upper().startswith("U+") else part
        if "-" in token:
            start, end = token.split("-", 1)
            out.extend(range(int(start, 16), int(end, 16) + 1))
        else:
            out.append(int(token, 16))
    return out

def subset_to(src, dest, unicodes, flavor=None):
    font = TTFont(src)
    options = Options()
    options.flavor = flavor
    options.layout_features = ["kern", "liga", "calt", "ccmp", "locl"]
    options.hinting = False
    options.desubroutinize = True
    options.ignore_missing_unicodes = True
    options.ignore_missing_glyphs = True
    subsetter = Subsetter(options=options)
    subsetter.populate(unicodes=unicodes)
    subsetter.subset(font)
    if flavor:
        font.flavor = flavor
    font.save(dest)
    font.close()

payload = json.loads(sys.stdin.read())
inputs = payload["inputs"]
output = payload["output"]
unicodes = parse_unicodes(payload["unicodes"])

source_cps = set()
ttf_inputs = []
tmpdir = tempfile.mkdtemp(prefix="fontmerge-")
try:
    for i, src in enumerate(inputs):
        source_cps |= cmap_cps(src)
        ttf_path = os.path.join(tmpdir, f"in-{i}.ttf")
        subset_to(src, ttf_path, unicodes)
        ttf_inputs.append(ttf_path)

    merged_path = os.path.join(tmpdir, "merged.ttf")
    if len(ttf_inputs) == 1:
        os.replace(ttf_inputs[0], merged_path)
    else:
        merger = Merger()
        merged = merger.merge(ttf_inputs)
        merged.save(merged_path)

    os.makedirs(os.path.dirname(output), exist_ok=True)
    subset_to(merged_path, output, unicodes, flavor="woff2")
    out_cps = cmap_cps(output)
finally:
    for name in os.listdir(tmpdir):
        try:
            os.remove(os.path.join(tmpdir, name))
        except OSError:
            pass
    os.rmdir(tmpdir)

json.dump({"source": sorted(source_cps), "output": sorted(out_cps)}, sys.stdout)
`

function fail(message) {
  console.error(message)
  process.exit(1)
}

function resolveSources(pkg, filePrefix, weight) {
  const pkgDir = path.dirname(require.resolve(`${pkg}/package.json`))
  const filesDir = path.join(pkgDir, 'files')
  const subsets = ['latin', 'latin-ext']
  const found = []
  for (const subset of subsets) {
    const woff2 = path.join(filesDir, `${filePrefix}-${subset}-${weight}-normal.woff2`)
    const woff = path.join(filesDir, `${filePrefix}-${subset}-${weight}-normal.woff`)
    if (fs.existsSync(woff2)) found.push(woff2)
    else if (fs.existsSync(woff)) found.push(woff)
  }
  if (found.length === 0) {
    fail(`No source files for ${pkg} ${weight}`)
  }
  return found
}

function subsetFont(inputs, output) {
  const result = spawnSync('python3', ['-c', PYTHON], {
    input: JSON.stringify({ inputs, output, unicodes: UNICODE_RANGE }),
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  })
  if (result.status !== 0) {
    fail(`pyftsubset failed for ${output}:\n${result.stderr || result.stdout}`)
  }
  return JSON.parse(result.stdout)
}

function toPercent(value) {
  return `${(value * 100).toFixed(4).replace(/\.?0+$/, '')}%`
}

function fallbackOverrides(preferred, fallback) {
  const sizeAdjust =
    preferred.xWidthAvg / preferred.unitsPerEm / (fallback.xWidthAvg / fallback.unitsPerEm)
  const ascent = preferred.ascent / preferred.unitsPerEm / sizeAdjust
  const descent = Math.abs(preferred.descent) / preferred.unitsPerEm / sizeAdjust
  const lineGap = preferred.lineGap / preferred.unitsPerEm / sizeAdjust
  return {
    sizeAdjust: toPercent(sizeAdjust),
    ascentOverride: toPercent(ascent),
    descentOverride: toPercent(descent),
    lineGapOverride: toPercent(lineGap),
  }
}

fs.mkdirSync(outDir, { recursive: true })

const missingFromSource = []
let failedGlyphs = false

for (const font of FONTS) {
  const inputs = resolveSources(font.pkg, font.filePrefix, font.weight)
  const output = path.join(outDir, `${font.id}.woff2`)
  console.log(`Subsetting ${font.id} from:\n  ${inputs.join('\n  ')}`)
  const { source, output: outCps } = subsetFont(inputs, output)
  const sourceSet = new Set(source)
  const outSet = new Set(outCps)
  const size = fs.statSync(output).size
  console.log(`  wrote ${path.relative(root, output)} (${size} bytes, ${outCps.length} glyphs)`)

  for (const glyph of font.required) {
    const cp = glyph.codePointAt(0)
    if (outSet.has(cp)) continue
    if (!sourceSet.has(cp)) {
      missingFromSource.push(`${font.id}: '${glyph}' U+${cp.toString(16).toUpperCase()} missing from original font`)
      console.warn(`  WARN: ${glyph} not in original ${font.id}`)
    } else {
      failedGlyphs = true
      console.error(`  ERROR: ${glyph} dropped by subset for ${font.id}`)
    }
  }
}

const files = FONTS.map((font) => path.join(outDir, `${font.id}.woff2`))
const total = files.reduce((sum, file) => sum + fs.statSync(file).size, 0)
const preload = fs.statSync(path.join(outDir, 'dm-sans-600.woff2')).size

console.log(`\nTotal woff2: ${total} bytes (limit 122880)`)
console.log(`Preload 600: ${preload} bytes (limit 61440)`)

const dmFallback = fallbackOverrides(dmSansMetrics, arialMetrics)
const monoFallback = fallbackOverrides(jetBrainsMetrics, courierNewMetrics)

const fallbackCss = `
@font-face {
  font-family: "DM Sans Fallback";
  src: local("Arial");
  size-adjust: ${dmFallback.sizeAdjust};
  ascent-override: ${dmFallback.ascentOverride};
  descent-override: ${dmFallback.descentOverride};
  line-gap-override: ${dmFallback.lineGapOverride};
}

@font-face {
  font-family: "JetBrains Mono Fallback";
  src: local("Courier New");
  size-adjust: ${monoFallback.sizeAdjust};
  ascent-override: ${monoFallback.ascentOverride};
  descent-override: ${monoFallback.descentOverride};
  line-gap-override: ${monoFallback.lineGapOverride};
}
`.trim()

const reportPath = path.join(root, 'scripts/font-fallback.generated.css')
fs.writeFileSync(reportPath, `${fallbackCss}\n`)
console.log(`\nWrote fallback CSS to ${path.relative(root, reportPath)}:\n`)
console.log(fallbackCss)

if (missingFromSource.length) {
  console.warn('\nGlyphs missing from the original packages (not a subset bug):')
  for (const line of missingFromSource) console.warn(`- ${line}`)
}

if (failedGlyphs) {
  fail('Required glyphs present in the source were missing from the subset.')
}

if (total > 120 * 1024) {
  fail(`Font files exceed 120 KB (${total} bytes)`)
}
if (preload > 60 * 1024) {
  fail(`Preload fonts exceed 60 KB (${preload} bytes)`)
}

console.log('\nFont build OK.')
