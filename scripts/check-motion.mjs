import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src')
const FORBIDDEN_PROPS = ['width', 'height', 'top', 'left', 'clip-path', 'filter', 'box-shadow']
const BANNED_LIB = ['framer', 'motion'].join('-')

function walk(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (/\.(ts|tsx|css)$/.test(entry.name)) out.push(full)
  }
  return out
}

function extractKeyframes(css) {
  const blocks = []
  const re = /@keyframes\s+[\w-]+\s*\{/g
  let match
  while ((match = re.exec(css))) {
    let depth = 1
    let i = match.index + match[0].length
    while (i < css.length && depth > 0) {
      if (css[i] === '{') depth += 1
      else if (css[i] === '}') depth -= 1
      i += 1
    }
    blocks.push(css.slice(match.index, i))
  }
  return blocks
}

function hasForbiddenProp(list) {
  const tokens = list
    .split(',')
    .map((part) => part.trim().split(/\s+/)[0])
    .filter(Boolean)
  return tokens.some((token) => FORBIDDEN_PROPS.includes(token))
}

const errors = []

for (const file of walk(srcRoot)) {
  const rel = path.relative(srcRoot, file)
  const text = fs.readFileSync(file, 'utf8')

  if (text.includes(BANNED_LIB)) {
    errors.push(`${rel}: ${BANNED_LIB} is not allowed`)
  }

  if (/addEventListener\(\s*['"]scroll['"]/.test(text)) {
    errors.push(`${rel}: addEventListener('scroll') is not allowed`)
  }

  if (/(?:^|[\s"'`])transition-all(?:$|[\s"'`])/.test(text)) {
    errors.push(`${rel}: transition-all is not allowed`)
  }

  for (const match of text.matchAll(/transition-\[([^\]]+)\]/g)) {
    if (hasForbiddenProp(match[1])) {
      errors.push(`${rel}: forbidden properties in transition-[${match[1]}]`)
    }
  }

  for (const match of text.matchAll(/transition(?:-property)?\s*:\s*([^;{}]+)/g)) {
    const value = match[1].trim()
    if (value === 'all' || value.startsWith('all ')) {
      errors.push(`${rel}: transition: all is not allowed`)
      continue
    }
    if (hasForbiddenProp(value)) {
      errors.push(`${rel}: forbidden properties in transition: ${value}`)
    }
  }

  if (file.endsWith('.css')) {
    for (const block of extractKeyframes(text)) {
      for (const prop of FORBIDDEN_PROPS) {
        const propRe = new RegExp(`(?:^|[{;\\s])${prop}\\s*:`, 'm')
        if (propRe.test(block)) {
          errors.push(`${rel}: @keyframes animates '${prop}'`)
        }
      }
    }
  }
}

if (errors.length > 0) {
  console.error('Motion rule check failed:\n')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('Motion rule check passed.')
