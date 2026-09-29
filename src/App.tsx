import { HelmetProvider } from 'react-helmet-async'
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

function App() {
  return (
    <HelmetProvider>
      <ThemeProvider>
        <I18nProvider>
          <SeoHead />
          <GridBackground />
          <Navbar />
          <main>
            <Hero />
            <About />
            <Experience />
            <Skills />
            <Projects />
            <CvDownload />
            <Contact />
          </main>
          <Footer />
        </I18nProvider>
      </ThemeProvider>
    </HelmetProvider>
  )
}

export default App
