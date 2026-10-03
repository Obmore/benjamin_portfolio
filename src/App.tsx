import { lazy, Suspense, useEffect, useState, type MouseEvent } from 'react'
import { Navbar } from '@/components/layout/Navbar'
import { SeoHead } from '@/components/SeoHead'
import { Hero } from '@/components/sections/Hero'
import { I18nProvider, useI18n } from '@/context/I18nContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { useInitialHash } from '@/hooks/useInitialHash'

const AppRest = lazy(() => import('./AppRest'))

function SkipLink() {
  const { content } = useI18n()

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    const main = document.querySelector('main')
    if (!(main instanceof HTMLElement)) return
    main.focus({ preventScroll: true })
  }

  return (
    <a href="#main" className="skip-link" onClick={onClick}>
      {content.common.skipToContent}
    </a>
  )
}

function yieldMain(): Promise<void> {
  const sched = (globalThis as unknown as { scheduler?: { yield?: () => Promise<void> } }).scheduler
  if (typeof sched?.yield === 'function') return sched.yield()
  return new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}

function AppShell() {
  useInitialHash()
  const [rest, setRest] = useState(false)

  useEffect(() => {
    let cancelled = false
    const start = () => {
      if (!cancelled) setRest(true)
    }
    if (window.location.hash) {
      start()
      return () => {
        cancelled = true
      }
    }
    void yieldMain().then(start)
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <SeoHead />
      <SkipLink />
      <Navbar />
      <main id="main" tabIndex={-1} className="outline-none">
        <Hero />
        {rest ? (
          <Suspense fallback={null}>
            <AppRest />
          </Suspense>
        ) : null}
      </main>
    </>
  )
}

function App() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <AppShell />
      </ThemeProvider>
    </I18nProvider>
  )
}

export default App
