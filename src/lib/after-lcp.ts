/** Wait for LCP, then an idle slice, without doing any WebGL or 3D work. */

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
  return new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      resolve()
    }

    const sawLcp = () => performance.getEntriesByType('largest-contentful-paint').length > 0

    try {
      if (sawLcp()) {
        finish()
        return
      }
      const po = new PerformanceObserver((list) => {
        if (list.getEntries().length === 0) return
        po.disconnect()
        finish()
      })
      po.observe({ type: 'largest-contentful-paint', buffered: true })
    } catch {
      finish()
      return
    }

    setTimeout(finish, 4000)
  })
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
