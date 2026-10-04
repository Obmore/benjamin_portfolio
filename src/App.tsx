import type { MouseEvent } from 'react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { SeoHead } from '@/components/SeoHead'
import { GridBackground } from '@/components/visuals/GridBackground'
import { Hero } from '@/components/sections/Hero'
import { About } from '@/components/sections/About'
import { Experience } from '@/components/sections/Experience'
import { Skills } from '@/components/sections/Skills'
import { Projects } from '@/components/sections/Projects'
import { CvDownload } from '@/components/sections/CvDownload'
import { Contact } from '@/components/sections/Contact'
import { I18nProvider, useI18n } from '@/context/I18nContext'
import { useInitialHash } from '@/hooks/useInitialHash'

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

  return (
    <>
      <SeoHead />
      <SkipLink />
      <GridBackground />
      <Navbar />
      <main id="main" tabIndex={-1} className="outline-none">
        <Hero />
        <Projects />
        <About />
        <Experience />
        <Skills />
        <CvDownload />
        <Contact />
      </main>
      <Footer />
    </>
  )
}

function App() {
  return (
    <I18nProvider>
      <AppShell />
    </I18nProvider>
  )
}

export default App
