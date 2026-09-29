import { HelmetProvider } from 'react-helmet-async'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { SeoHead } from '@/components/SeoHead'
import { BlueprintBackground } from '@/components/visuals/BlueprintBackground'
import { SheetFrame, SignalMeasure } from '@/components/visuals/SignalRail'
import { Hero } from '@/components/sections/Hero'
import { Problem } from '@/components/sections/Problem'
import { Solution } from '@/components/sections/Solution'
import { Marquee } from '@/components/sections/Marquee'
import { QuoteDemo } from '@/components/sections/QuoteDemo'
import { Process } from '@/components/sections/Process'
import { Projects } from '@/components/sections/Projects'
import { Services } from '@/components/sections/Services'
import { About } from '@/components/sections/About'
import { Experience } from '@/components/sections/Experience'
import { Skills } from '@/components/sections/Skills'
import { CvDownload } from '@/components/sections/CvDownload'
import { Contact } from '@/components/sections/Contact'
import { MotionRoot } from '@/components/motion/MotionRoot'
import { I18nProvider } from '@/context/I18nContext'
import { ThemeProvider } from '@/context/ThemeContext'

function App() {
  return (
    <HelmetProvider>
      <ThemeProvider>
        <I18nProvider>
          <MotionRoot>
            <SeoHead />
            <BlueprintBackground />
            <SheetFrame />
            <Navbar />
            <main id="main" className="relative" tabIndex={-1}>
              <SignalMeasure />
              <Hero />
              <Problem />
              <Solution />
              <Marquee />
              <QuoteDemo />
              <Process />
              <Projects />
              <Services />
              <About />
              <Experience />
              <Skills />
              <CvDownload />
              <Contact />
            </main>
            <Footer />
          </MotionRoot>
        </I18nProvider>
      </ThemeProvider>
    </HelmetProvider>
  )
}

export default App
