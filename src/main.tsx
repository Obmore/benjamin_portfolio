import './index.css'

function yieldMain(): Promise<void> {
  const sched = (globalThis as unknown as { scheduler?: { yield?: () => Promise<void> } }).scheduler
  if (typeof sched?.yield === 'function') return sched.yield()
  return new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}

void (async () => {
  const reactP = import('react')
  const clientP = import('react-dom/client')
  const appP = import('./App')
  const { createElement, StrictMode } = await reactP
  await yieldMain()
  const { createRoot } = await clientP
  await yieldMain()
  const { default: App } = await appP
  await yieldMain()
  const root = document.getElementById('root')
  if (!root) return
  createRoot(root).render(createElement(StrictMode, null, createElement(App)))
})()
