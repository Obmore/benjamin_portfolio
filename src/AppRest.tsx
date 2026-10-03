import { Footer } from '@/components/layout/Footer'
import { About } from '@/components/sections/About'
import { Contact } from '@/components/sections/Contact'
import { CvDownload } from '@/components/sections/CvDownload'
import { Experience } from '@/components/sections/Experience'
import { Projects } from '@/components/sections/Projects'
import { Skills } from '@/components/sections/Skills'
import { GridBackground } from '@/components/visuals/GridBackground'

export default function AppRest() {
  return (
    <>
      <GridBackground />
      <Projects />
      <About />
      <Experience />
      <Skills />
      <CvDownload />
      <Contact />
      <Footer />
    </>
  )
}
