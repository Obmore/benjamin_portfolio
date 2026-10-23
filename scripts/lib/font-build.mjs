import fs from 'node:fs'
import path from 'node:path'

const REQUIREMENTS = 'scripts/requirements-fonts.txt'

function attrs(tag) {
  const out = {}
  for (const match of tag.matchAll(/([a-zA-Z_:][\w:.-]*)=(?:"([^"]*)"|'([^']*)')/g)) {
    out[match[1]] = match[2] ?? match[3] ?? ''
  }
  return out
}

/** Every font the page preloads, as the site-root paths from its `<link rel="preload" as="font">` tags. */
export function preloadedFonts(html) {
  const hrefs = []
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const a = attrs(match[0])
    if ((a.rel ?? '').toLowerCase() === 'preload' && a.as === 'font' && a.href) {
      hrefs.push(a.href.split('?')[0].split('#')[0])
    }
  }
  return hrefs
}

/** Raw size of all preloaded fonts, resolved against the directory that is served as the site root. */
export function preloadBytes(html, publicDir) {
  const files = preloadedFonts(html).map((href) => {
    const file = path.join(publicDir, href.replace(/^\//, ''))
    if (!fs.existsSync(file)) throw new Error(`Preloaded font ${href} not found at ${file}`)
    return { href, bytes: fs.statSync(file).size }
  })
  return { files, total: files.reduce((sum, file) => sum + file.bytes, 0) }
}

/** The interpreter for the subsetting step: PYTHON, else `python` on Windows (where `python3` is a Store stub), else `python3`. */
export function defaultPython(env, platform) {
  return env.PYTHON || (platform === 'win32' ? 'python' : 'python3')
}

/**
 * Null when `python` can import what the subsetter needs, otherwise a message that says what to do.
 * `run(command, args)` has the shape of `child_process.spawnSync` with `encoding: 'utf8'`.
 */
export function pythonSetupProblem({ python, run }) {
  const result = run(python, ['-c', 'import fontTools, brotli'])
  if (!result.error && result.status === 0) return null

  const stderr = String(result.stderr ?? '')
  const missing = /ModuleNotFoundError: No module named '([^']+)'/.exec(stderr)
  if (!result.error && missing) {
    return `The Python at "${python}" is missing the "${missing[1]}" module (fonttools and Brotli are needed). Install them with:\n  ${python} -m pip install -r ${REQUIREMENTS}`
  }

  const detail = result.error?.message ?? (stderr.trim().split('\n')[0] || `exit status ${result.status}`)
  return `Could not run Python ("${python}"): ${detail}\nInstall Python 3 or point PYTHON at an interpreter, for example:\n  PYTHON=/path/to/python npm run build:fonts`
}
