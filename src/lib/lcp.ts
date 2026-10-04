/** Shared LCP waiter. One PerformanceObserver for the whole app — never getEntriesByType('largest-contentful-paint'). */

let shared: Promise<void> | null = null

export function whenLcp(timeoutMs = 4000): Promise<void> {
  if (shared) return shared
  shared = new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      resolve()
    }
    try {
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
    setTimeout(finish, timeoutMs)
  })
  return shared
}
