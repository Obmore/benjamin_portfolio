import { HelmetProvider } from 'react-helmet-async'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { SeoHead } from '@/components/SeoHead'
import { BlueprintBackground } from '@/components/visuals/BlueprintBackground'
import { SheetFrame, SignalMeasure } from '@/components/visuals/SignalRail'
import { Hero } from '@/components/sections/Hero'
import { About } from '@/components/sections/About'
import { Services } from '@/components/sections/Services'
import { Experience } from '@/components/sections/Experience'
import { Skills } from '@/components/sections/Skills'
import { Projects } from '@/components/sections/Projects'
import { QuoteDemo } from '@/components/sections/QuoteDemo'
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
          <BlueprintBackground />
          <SheetFrame />
          <Navbar />
          <main id="main" className="relative" tabIndex={-1}>
            <SignalMeasure />
            <Hero />
            <Services />
            <Projects />
            <About />
            <Experience />
            <Skills />
            <CvDownload />
            <QuoteDemo />
            <Contact />
          </main>
          <Footer />
        </I18nProvider>
      </ThemeProvider>
    </HelmetProvider>
  )
}

export default App
