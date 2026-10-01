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
import { I18nProvider } from '@/context/I18nContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { useInitialHash } from '@/hooks/useInitialHash'

function AppShell() {
  useInitialHash()

  return (
    <>
      <SeoHead />
      <GridBackground />
      <Navbar />
      <main>
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
      <ThemeProvider>
        <AppShell />
      </ThemeProvider>
    </I18nProvider>
  )
}

export default App
