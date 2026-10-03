#!/usr/bin/env node
/**
 * Hero 3D long-task + LCP measurement (Motion acceptance).
 *
 * From navigation start, with Chromium CPU 4× and SwiftShader WebGL:
 *   - 390×844 lite, with and without ?qa3d=1
 *   - 1440×900 full, with and without ?qa3d=1
 *   - reduced-motion LCP baseline on the same build for each viewport
 *
 * Prints every PerformanceObserver longtask >50 ms with timestamps,
 * plus LCP vs reduced-motion (±10% on 390 is the acceptance gate).
 *
 * Usage (preview must serve dist/):
 *   npm run build && npm run preview -- --host 127.0.0.1 --port 4173
 *   node scripts/measure-hero-longtasks.mjs
 *
 * Env:
 *   BASE_URL   default http://127.0.0.1:4173
 *   CPU_RATE   default 4
 *   KEEP_PREVIEW  if 1, do not spawn preview when BASE_URL is already up
 */
import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BASE = process.env.BASE_URL || 'http://127.0.0.1:4173'
const CPU = Number(process.env.CPU_RATE || 4)
const TASK_LIMIT = 120
const TASK_REPORT = 50
const LCP_TOLERANCE = 0.1
const EXTRA_MS = 1500
const READY_MS = 30000

const GL_ARGS = [
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--ignore-gpu-blocklist',
  '--disable-features=Vulkan',
]

const INIT = `(() => {
  const w = window
  w.__heroLt = { tasks: [], lcp: null, lcpEntries: [] }
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        w.__heroLt.tasks.push({
          d: e.duration,
          t: e.startTime,
          name: e.name,
        })
      }
    }).observe({ type: 'longtask', buffered: true })
  } catch (err) {}
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        const rec = {
          t: e.startTime,
          size: e.size,
          url: e.url || '',
          tag: e.element ? e.element.tagName : '',
          id: e.element && e.element.id ? e.element.id : '',
          cls: e.element && e.element.className ? String(e.element.className) : '',
        }
        w.__heroLt.lcpEntries.push(rec)
        w.__heroLt.lcp = rec
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true })
  } catch (err) {}
})()`

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForPreview() {
  const deadline = Date.now() + 60000
  while (Date.now() < deadline) {
    try {
      const res = await fetch(BASE)
      if (res.ok) return
    } catch {
      /* retry */
    }
    await sleep(250)
  }
  throw new Error(`preview not reachable at ${BASE}`)
}

async function ensurePreview() {
  try {
    const res = await fetch(BASE)
    if (res.ok) return null
  } catch {
    /* spawn */
  }
  const child = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4173'], {
    cwd: root,
    stdio: 'ignore',
    detached: true,
  })
  child.unref()
  await waitForPreview()
  return child
}

async function measure(browser, { width, height, query, reducedMotion, label }) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    reducedMotion: reducedMotion ? 'reduce' : 'no-preference',
  })
  const page = await context.newPage()
  const cdp = await context.newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU })
  await page.addInitScript(INIT)

  const started = Date.now()
  await page.goto(`${BASE}/${query}`, { waitUntil: 'domcontentloaded', timeout: 60000 })

  if (!reducedMotion) {
    try {
      await page.waitForFunction(
        () => document.querySelector('.hero-3d')?.classList.contains('is-ready'),
        null,
        { timeout: READY_MS },
      )
    } catch {
      /* still collect whatever ran */
    }
  } else {
    await page.waitForFunction(
      () => Boolean(window.__heroLt?.lcp) || document.readyState === 'complete',
      null,
      { timeout: 15000 },
    )
  }
  await sleep(EXTRA_MS)

  const probe = await page.evaluate(() => {
    const w = window
    const tasks = (w.__heroLt?.tasks ?? []).slice()
    const lcp = w.__heroLt?.lcp ?? null
    const lcpEntries = w.__heroLt?.lcpEntries ?? []
    const nav = performance.getEntriesByType('navigation')[0]
    const canvas = document.querySelector('.hero-3d canvas')
    let gl = false
    if (canvas instanceof HTMLCanvasElement) {
      gl = Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
    }
    const resources = performance.getEntriesByType('resource').map((e) => ({
      name: String(e.name).split('/').pop(),
      start: e.startTime,
      dur: e.duration,
    }))
    return {
      tasks,
      lcp,
      lcpEntries,
      navStartToLoad: nav ? nav.loadEventEnd : null,
      ready: Boolean(document.querySelector('.hero-3d')?.classList.contains('is-ready')),
      tier: document.querySelector('.hero-3d')?.getAttribute('data-hero3d-tier') ?? null,
      canvas: Boolean(canvas),
      gl,
      poster: Boolean(document.querySelector('.hero-3d-poster')),
      threeRes: resources.filter((r) => /^(three|gsap)/.test(r.name || '')),
    }
  })

  await context.close()
  const over50 = probe.tasks
    .filter((e) => e.d > TASK_REPORT)
    .sort((a, b) => a.t - b.t)
  const maxTask = probe.tasks.reduce((m, e) => Math.max(m, e.d), 0)
  return {
    label,
    width,
    height,
    query,
    reducedMotion,
    wallMs: Date.now() - started,
    maxTask,
    over50,
    tasks: probe.tasks,
    lcp: probe.lcp,
    lcpMs: probe.lcp?.t ?? null,
    ready: probe.ready,
    tier: probe.tier,
    canvas: probe.canvas,
    gl: probe.gl,
    poster: probe.poster,
    threeRes: probe.threeRes,
  }
}

function fmtTask(e) {
  return `t=${e.t.toFixed(1)}ms  d=${e.d.toFixed(1)}ms${e.name ? `  ${e.name}` : ''}`
}

function printRun(run) {
  console.log(`\n=== ${run.label} ===`)
  console.log(
    `viewport ${run.width}x${run.height}  query="${run.query}"  reducedMotion=${run.reducedMotion}  cpu=${CPU}x`,
  )
  console.log(
    `LCP ${run.lcpMs == null ? 'n/a' : `${run.lcpMs.toFixed(1)} ms`}` +
      (run.lcp ? `  el=${run.lcp.tag}${run.lcp.id ? '#' + run.lcp.id : ''} .${run.lcp.cls} size=${run.lcp.size}` : ''),
  )
  console.log(
    `ready=${run.ready}  canvas=${run.canvas}  webgl=${run.gl}  tier=${run.tier}  poster=${run.poster}  wall=${run.wallMs}ms`,
  )
  if (run.threeRes.length) {
    console.log(
      '3D/GSAP resources:',
      run.threeRes.map((r) => `${r.name} @${r.start.toFixed(0)}ms`).join(', '),
    )
  }
  if (run.lcpSamples) {
    console.log(
      `samples LCP [${run.lcpSamples.map((n) => n.toFixed(0)).join(', ')}] ms  maxTask [${run.maxTaskSamples.map((n) => n.toFixed(0)).join(', ')}] ms`,
    )
  }
  if (run.samples) {
    run.samples.forEach((sample, i) => {
      const rows = sample.over50.length
        ? sample.over50.map(fmtTask).join('\n    ')
        : '(none)'
      console.log(`  sample ${i + 1} LCP ${sample.lcpMs?.toFixed(1) ?? 'n/a'} max ${sample.maxTask.toFixed(1)}:\n    ${rows}`)
    })
    return
  }
  console.log(`max longtask ${run.maxTask.toFixed(1)} ms; tasks >${TASK_REPORT} ms (${run.over50.length}) (first sample):`)
  if (run.over50.length === 0) console.log('  (none)')
  for (const e of run.over50) console.log(`  ${fmtTask(e)}`)
}

async function main() {
  const spawned = await ensurePreview()
  const browser = await chromium.launch({
    headless: true,
    args: GL_ARGS,
  })

  const warm = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const warmPage = await warm.newPage()
  await warmPage.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await warm.close()

  const jobs = [
    { width: 390, height: 844, query: '', reducedMotion: true, label: '390 reduced-motion' },
    { width: 390, height: 844, query: '?qa3d=1', reducedMotion: false, label: '390 qa3d=1' },
    { width: 390, height: 844, query: '', reducedMotion: false, label: '390 default (WebGL)' },
    { width: 1440, height: 900, query: '', reducedMotion: true, label: '1440 reduced-motion' },
    { width: 1440, height: 900, query: '?qa3d=1', reducedMotion: false, label: '1440 qa3d=1' },
    { width: 1440, height: 900, query: '', reducedMotion: false, label: '1440 default (WebGL)' },
  ]

  const repeats = Number(process.env.SAMPLES || 3)
  const runs = []
  for (const job of jobs) {
    const samples = []
    for (let i = 0; i < repeats; i += 1) {
      samples.push(await measure(browser, job))
    }
    const lcpVals = samples.map((s) => s.lcpMs).filter((n) => n != null).sort((a, b) => a - b)
    const maxTasks = samples.map((s) => s.maxTask)
    const mid = Math.floor(lcpVals.length / 2)
    const medianLcp =
      lcpVals.length === 0
        ? null
        : lcpVals.length % 2
          ? lcpVals[mid]
          : (lcpVals[mid - 1] + lcpVals[mid]) / 2
    runs.push({
      ...samples[0],
      lcpMs: medianLcp,
      maxTask: Math.max(...maxTasks),
      samples,
      lcpSamples: lcpVals,
      maxTaskSamples: maxTasks,
    })
  }
  await browser.close()

  for (const run of runs) printRun(run)

  const byLabel = Object.fromEntries(runs.map((r) => [r.label, r]))
  const checks = []
  const gate = (ok, msg) => {
    checks.push({ ok, msg })
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`)
  }

  console.log('\n--- Acceptance (390 / 4× CPU / WebGL) ---')
  for (const label of ['390 qa3d=1', '390 default (WebGL)']) {
    const run = byLabel[label]
    const rm = byLabel['390 reduced-motion']
    gate(run.gl || run.canvas, `${label}: WebGL canvas present`)
    gate(run.maxTask <= TASK_LIMIT, `${label}: max longtask ${run.maxTask.toFixed(1)} <= ${TASK_LIMIT} ms`)
    if (run.lcpMs != null && rm.lcpMs != null) {
      const ratio = run.lcpMs / rm.lcpMs
      const delta = ((run.lcpMs - rm.lcpMs) / rm.lcpMs) * 100
      gate(
        Math.abs(ratio - 1) <= LCP_TOLERANCE,
        `${label}: LCP ${run.lcpMs.toFixed(1)} vs RM ${rm.lcpMs.toFixed(1)} (${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%) within ±${LCP_TOLERANCE * 100}%`,
      )
    } else {
      gate(false, `${label}: missing LCP (run=${run.lcpMs} rm=${rm.lcpMs})`)
    }
  }

  console.log('\n--- Report (1440) ---')
  for (const label of ['1440 qa3d=1', '1440 default (WebGL)']) {
    const run = byLabel[label]
    const rm = byLabel['1440 reduced-motion']
    const delta =
      run.lcpMs != null && rm.lcpMs != null ? ((run.lcpMs - rm.lcpMs) / rm.lcpMs) * 100 : null
    console.log(
      `${label}: max longtask ${run.maxTask.toFixed(1)} ms  LCP ${run.lcpMs?.toFixed(1) ?? 'n/a'} vs RM ${rm.lcpMs?.toFixed(1) ?? 'n/a'}` +
        (delta == null ? '' : ` (${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%)`) +
        `  webgl=${run.gl}`,
    )
  }

  const outDir = path.join(root, 'test-results')
  mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, 'hero-longtasks.json')
  writeFileSync(outPath, `${JSON.stringify({ cpu: CPU, taskLimit: TASK_LIMIT, runs, checks }, null, 2)}\n`)
  console.log(`\nwrote ${path.relative(root, outPath)}`)

  if (spawned && process.env.KEEP_PREVIEW !== '1') {
    try {
      process.kill(-spawned.pid, 'SIGTERM')
    } catch {
      /* ignore */
    }
  }

  if (checks.some((c) => !c.ok)) {
    console.error('\nMeasurement failed acceptance.')
    process.exit(1)
  }
  console.log('\nMeasurement passed acceptance.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
