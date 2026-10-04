import './node-filereader.mjs'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import * as THREE from 'three'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import * as layoutSrc from '../src/three/k1-layout.ts'
import { buildK1Scene, packLayout } from './k1-hero-scene.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'public/hero')
const rawPath = path.join(os.tmpdir(), 'k1-raw.glb')
const outPath = path.join(outDir, 'k1.glb')

fs.mkdirSync(outDir, { recursive: true })

const packed = packLayout(layoutSrc)
const { scene } = buildK1Scene(THREE, packed)

const exporter = new GLTFExporter()
const data = await exporter.parseAsync(scene, { binary: true })
const buf = Buffer.isBuffer(data) ? data : Buffer.from(data)
fs.writeFileSync(rawPath, buf)
console.log(`raw GLB ${buf.length} B → ${rawPath}`)

const cli = path.join(root, 'node_modules/@gltf-transform/cli/bin/cli.js')
const optimize = spawnSync(
  process.execPath,
  [
    cli,
    'optimize',
    rawPath,
    outPath,
    '--compress',
    'quantize',
    '--simplify',
    'false',
    '--palette',
    'false',
    '--join',
    'false',
    '--join-named',
    'false',
    '--flatten',
    'false',
    '--instance',
    'false',
    '--texture-compress',
    'false',
  ],
  { cwd: root, stdio: 'inherit' },
)
if (optimize.status !== 0) {
  console.error('gltf-transform optimize failed')
  process.exit(optimize.status ?? 1)
}

const inspect = spawnSync(process.execPath, [cli, 'inspect', outPath], {
  cwd: root,
  encoding: 'utf8',
})
process.stdout.write(inspect.stdout ?? '')
if (inspect.stderr) process.stderr.write(inspect.stderr)
if (inspect.status !== 0) {
  console.error('gltf-transform inspect failed')
  process.exit(inspect.status ?? 1)
}

const validate = spawnSync(process.execPath, [cli, 'validate', outPath], {
  cwd: root,
  encoding: 'utf8',
})
process.stdout.write(validate.stdout ?? '')
if (validate.stderr) process.stderr.write(validate.stderr)
if (validate.status !== 0) {
  console.error('gltf-transform validate failed')
  process.exit(validate.status ?? 1)
}

const size = fs.statSync(outPath).size
console.log(`optimized GLB ${size} B (${(size / 1024).toFixed(2)} KB) → ${path.relative(root, outPath)}`)
if (size > 40 * 1024) {
  console.error(`GLB exceeds 40 KB budget (${size} B)`)
  process.exit(1)
}

void pathToFileURL
