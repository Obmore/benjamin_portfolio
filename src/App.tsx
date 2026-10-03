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
    let po: PerformanceObserver | null = null
    let fallback = 0
    const kick = () => {
      po?.disconnect()
      if (fallback) window.clearTimeout(fallback)
      fallback = window.setTimeout(start, 500)
    }
    try {
      if (performance.getEntriesByType('largest-contentful-paint').length > 0) {
        kick()
      } else {
        po = new PerformanceObserver(() => kick())
        po.observe({ type: 'largest-contentful-paint', buffered: true })
        fallback = window.setTimeout(kick, 4000)
      }
    } catch {
      kick()
    }
    return () => {
      cancelled = true
      po?.disconnect()
      if (fallback) window.clearTimeout(fallback)
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
