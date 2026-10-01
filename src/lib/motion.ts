export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function canViewTransition() {
  return typeof document.startViewTransition === 'function'
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function nextFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })
}

export function startThemedViewTransition(kind: 'theme' | 'lang', update: () => void) {
  const reduced = prefersReducedMotion()
  if (reduced || !canViewTransition()) {
    update()
    return Promise.resolve()
  }

  const root = document.documentElement
  const className = kind === 'theme' ? 'is-theme-vt' : 'is-lang-vt'
  root.classList.add(className)

  const transition = document.startViewTransition(() => {
    update()
  })

  return transition.finished.catch(() => undefined).finally(() => {
    root.classList.remove(className)
  })
}

export async function runLangCssFallback(update: () => void) {
  const main = document.querySelector('main')
  if (!main || prefersReducedMotion()) {
    update()
    return
  }

  main.classList.add('is-lang-out')
  await nextFrame()
  await sleep(150)
  main.classList.add('is-lang-hold')
  main.classList.remove('is-lang-out')
  update()
  await nextFrame()
  main.classList.remove('is-lang-hold')
  main.classList.add('is-lang-in')
  await sleep(200)
  main.classList.remove('is-lang-in')
}
