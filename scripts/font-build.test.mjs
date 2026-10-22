import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  defaultPython,
  preloadBytes,
  preloadedFonts,
  pythonSetupProblem,
} from './lib/font-build.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')

test('preloadedFonts lists every font preload and nothing else', () => {
  const html = `
    <link rel="preload" as="font" type="font/woff2" crossorigin href="/fonts/a-400.woff2" />
    <link
      rel="preload"
      as="font"
      crossorigin
      href="/fonts/b-600.woff2?v=2"
    />
    <link rel="preload" as="style" href="/assets/main.css" />
    <link rel="stylesheet" href="/fonts/not-a-preload.woff2" />
    <link rel="modulepreload" href="/assets/main.js" />`
  assert.deepEqual(preloadedFonts(html), ['/fonts/a-400.woff2', '/fonts/b-600.woff2'])
})

test('preloadBytes sums all preloaded fonts, not just one', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'font-preload-'))
  try {
    fs.mkdirSync(path.join(dir, 'fonts'))
    const sizes = { 'a-400': 100, 'a-500': 200, 'a-600': 400, 'mono-400': 800, 'mono-500': 1600 }
    for (const [id, size] of Object.entries(sizes)) {
      fs.writeFileSync(path.join(dir, 'fonts', `${id}.woff2`), Buffer.alloc(size))
    }
    const html = ['a-400', 'a-500', 'a-600', 'mono-400']
      .map((id) => `<link rel="preload" as="font" type="font/woff2" crossorigin href="/fonts/${id}.woff2" />`)
      .join('\n')
    const { files, total } = preloadBytes(html, dir)
    assert.equal(files.length, 4)
    assert.equal(total, 100 + 200 + 400 + 800)
    assert.deepEqual(files.map((file) => file.href), [
      '/fonts/a-400.woff2',
      '/fonts/a-500.woff2',
      '/fonts/a-600.woff2',
      '/fonts/mono-400.woff2',
    ])
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('preloadBytes names a preloaded font whose file is missing', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'font-preload-'))
  try {
    const html = '<link rel="preload" as="font" href="/fonts/gone.woff2" />'
    assert.throws(() => preloadBytes(html, dir), /fonts\/gone\.woff2/)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('the real index.html preloads resolve to files in public/ and are all counted', () => {
  const html = read('index.html')
  const hrefs = preloadedFonts(html)
  assert.ok(hrefs.length > 1, 'index.html is expected to preload more than one font')
  const { files, total } = preloadBytes(html, path.join(root, 'public'))
  assert.equal(files.length, hrefs.length)
  const single = fs.statSync(path.join(root, 'public/fonts/dm-sans-600.woff2')).size
  assert.ok(total > single, 'the budget must cover more than dm-sans-600 alone')
})

test('build-fonts.mjs takes its preload size from the helper, not from one hard-coded file', () => {
  const source = read('scripts/build-fonts.mjs')
  assert.match(source, /from '\.\/lib\/font-build\.mjs'/)
  assert.doesNotMatch(source, /statSync\([^)]*dm-sans-600\.woff2/)
})

test('the Python requirements for build:fonts are declared', () => {
  const lines = read('scripts/requirements-fonts.txt')
    .split(/\r?\n/)
    .map((line) => line.trim().toLowerCase())
    .filter((line) => line && !line.startsWith('#'))
  for (const name of ['fonttools', 'brotli']) {
    assert.ok(
      lines.some((line) => new RegExp(`^${name}==\\d`).test(line)),
      `${name} must be pinned in scripts/requirements-fonts.txt`,
    )
  }
  assert.match(read('README.md'), /requirements-fonts\.txt/)
})

const fakeRun = (result) => () => ({ status: 0, stdout: '', stderr: '', ...result })

test('pythonSetupProblem is silent when the interpreter has both modules', () => {
  assert.equal(pythonSetupProblem({ python: 'python', run: fakeRun({}) }), null)
})

test('pythonSetupProblem explains a missing module with the install command', () => {
  const message = pythonSetupProblem({
    python: 'python',
    run: fakeRun({
      status: 1,
      stderr: "Traceback (most recent call last):\nModuleNotFoundError: No module named 'brotli'\n",
    }),
  })
  assert.match(message, /brotli/)
  assert.match(message, /pip install -r scripts\/requirements-fonts\.txt/)
})

test('pythonSetupProblem explains a missing interpreter and the PYTHON override', () => {
  const missing = pythonSetupProblem({
    python: 'python3',
    run: fakeRun({ status: null, error: Object.assign(new Error('spawn python3 ENOENT'), { code: 'ENOENT' }) }),
  })
  assert.match(missing, /python3/)
  assert.match(missing, /PYTHON=/)
  const storeStub = pythonSetupProblem({
    python: 'python3',
    run: fakeRun({ status: 9009, stderr: 'Python was not found; run without arguments to install from the Microsoft Store' }),
  })
  assert.match(storeStub, /PYTHON=/)
  assert.doesNotMatch(storeStub, /requirements-fonts/)
})

test('defaultPython honours PYTHON and avoids the Windows python3 Store stub', () => {
  assert.equal(defaultPython({ PYTHON: 'C:\\Py\\python.exe' }, 'win32'), 'C:\\Py\\python.exe')
  assert.equal(defaultPython({}, 'win32'), 'python')
  assert.equal(defaultPython({}, 'linux'), 'python3')
  assert.equal(defaultPython({}, 'darwin'), 'python3')
})
