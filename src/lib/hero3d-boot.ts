import { afterIdle, afterLcp, nextFrame } from '@/lib/after-lcp'
import { getGPUTier, type ModelEntry } from 'detect-gpu'

const BENCH_URL = '/detect-gpu/'
const BENCH_MS = 1500

function isSoftwareGpu(gpu = '') {
  return /swiftshader|llvmpipe|software/i.test(gpu)
}

function loadBenchmarks(file: string) {
  const ctrl = new AbortController()
  const timer = window.setTimeout(() => ctrl.abort(), BENCH_MS)
  return fetch(`${BENCH_URL}${file}`, { signal: ctrl.signal })
    .then(async (res) => {
      if (!res.ok) throw new Error('bench')
      const data = (await res.json()) as unknown[]
      const header = data.shift()
      if (Number.parseInt(String(header).split('.')[0] ?? '0', 10) < 4) throw new Error('bench')
      return data as ModelEntry[]
    })
    .finally(() => window.clearTimeout(timer))
}

async function desktopTier(): Promise<number> {
  try {
    const result = await getGPUTier({
      benchmarksURL: BENCH_URL.replace(/\/$/, ''),
      failIfMajorPerformanceCaveat: true,
      override: { loadBenchmarks },
    })
    if (isSoftwareGpu(result.gpu)) return 0
    return result.tier
  } catch {
    return 0
  }
}

export function bootHero3d(): () => void {
  const box = document.querySelector<HTMLElement>('.hero-3d')
  if (!box || document.documentElement.classList.contains('is-hero-poster')) {
    return () => {}
  }

  let stopped = false
  let stopView = () => {}

  void (async () => {
    await afterLcp()
    await nextFrame()
    if (stopped) return
    await afterIdle()
    await nextFrame()
    if (stopped) return
    box.dataset.hero3d = 'boot'
    const tier = await desktopTier()
    if (stopped) return
    if (tier < 2) {
      box.dataset.hero3d = 'poster'
      return
    }
    const mod = await import('@/three/hero3d')
    if (stopped) return
    try {
      stopView = await mod.startHero3d(box)
    } catch {
      box.dataset.hero3d = 'poster'
    }
  })()

  return () => {
    stopped = true
    stopView()
  }
}
