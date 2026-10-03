type NavMem = Navigator & {
  deviceMemory?: number
  connection?: { saveData?: boolean }
}

const WATCHDOG_KEY = 'ob-3d-off'

export type Hero3dTier = 'static' | 'lite' | 'full'
export type CpuClass = 'static' | 'lite' | 'ok'

let cpuLite = false

export function markCpuLite() {
  cpuLite = true
}

// Adapted from mrdoob/three.js examples/jsm/capabilities/WebGL.js @ 0.186.1
// https://github.com/mrdoob/three.js/blob/r186/examples/jsm/capabilities/WebGL.js
// Copyright (c) 2010-2026 three.js authors — SPDX: MIT
// Changes: exported as hasWebGL(); WebGL2 only; no error-message helper
export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(window.WebGL2RenderingContext && canvas.getContext('webgl2'))
  } catch {
    return false
  }
}

function sampleCpuWork(ms: number) {
  const t0 = performance.now()
  let n = 0
  let s = 0
  while (performance.now() - t0 < ms) {
    s = (s + n) | 0
    n += 1
  }
  void s
  return n
}

const CPU_SAMPLES = 5
const CPU_WINDOW_MS = 8
// Dead-band calibrated on Chromium + CDP throttle: 1x ~68k, 4x ~17k, 20x ~3k.
const CPU_STATIC_MAX = 10000
const CPU_LITE_MAX = 42000

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[(sorted.length - 1) >> 1]
}

function decideCpu(med: number): CpuClass {
  if (med < CPU_STATIC_MAX) return 'static'
  if (med < CPU_LITE_MAX) return 'lite'
  return 'ok'
}

// Adapted from pmndrs/drei src/core/PerformanceMonitor.tsx @ eafb38d077a9c12348bc9ed76eb6e1bc274fb7eb
// https://github.com/pmndrs/drei/blob/eafb38d077a9c12348bc9ed76eb6e1bc274fb7eb/src/core/PerformanceMonitor.tsx
// Copyright (c) 2020 react-spring — SPDX: MIT
// Changes: plain TS; CPU busy-loop samples instead of fps; one-shot median + dead-band; no R3F
export async function classifyCpu(): Promise<CpuClass> {
  const samples: number[] = []
  for (let i = 0; i < CPU_SAMPLES; i += 1) {
    samples.push(sampleCpuWork(CPU_WINDOW_MS))
    if (i < CPU_SAMPLES - 1) {
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 0)
      })
    }
  }
  const med = median(samples)
  const decision = decideCpu(med)
  if (isQa3d()) {
    console.info('[hero3d-cpu]', { med, samples, decision })
  }
  return decision
}

export function hero3dWidthTier(): 'lite' | 'full' {
  if (cpuLite) return 'lite'
  if (window.matchMedia('(max-width: 1023px), (pointer: coarse)').matches) return 'lite'
  return 'full'
}

export function isQa3d(): boolean {
  return new URLSearchParams(location.search).get('qa3d') === '1'
}

export function mark3dWatchdog() {
  try {
    sessionStorage.setItem(WATCHDOG_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function hero3dTier(): Hero3dTier {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'static'
  const n = navigator as NavMem
  if (n.connection?.saveData) return 'static'
  if (typeof n.deviceMemory === 'number' && n.deviceMemory < 4) return 'static'
  try {
    if (sessionStorage.getItem(WATCHDOG_KEY)) return 'static'
  } catch {
    /* ignore */
  }
  if (!hasWebGL()) return 'static'
  return hero3dWidthTier()
}
