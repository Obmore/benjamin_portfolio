/** Wait for LCP, then an idle slice, without doing any WebGL or 3D work. */

import { whenLcp } from '@/lib/lcp'

export function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      const sched = (globalThis as unknown as { scheduler?: { yield?: () => Promise<void> } }).scheduler
      if (typeof sched?.yield === 'function') {
        void sched.yield().then(resolve)
        return
      }
      setTimeout(resolve, 0)
    })
  })
}

export function afterLcp(): Promise<void> {
  return whenLcp()
}

export function afterIdle(): Promise<void> {
  return new Promise((resolve) => {
    const ric = window.requestIdleCallback
    if (typeof ric === 'function') ric(() => resolve(), { timeout: 3000 })
    else setTimeout(resolve, 1)
  })
}

export async function afterLcpAndIdle() {
  await afterLcp()
  await nextFrame()
  await afterIdle()
}
