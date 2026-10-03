import { useLayoutEffect, useEffect } from 'react'
import { Footer } from '@/components/layout/Footer'
import { About } from '@/components/sections/About'
import { Contact } from '@/components/sections/Contact'
import { CvDownload } from '@/components/sections/CvDownload'
import { Experience } from '@/components/sections/Experience'
import { Projects } from '@/components/sections/Projects'
import { Skills } from '@/components/sections/Skills'
import { GridBackground } from '@/components/visuals/GridBackground'
import { scheduleHashRealign, syncInitialHash } from '@/hooks/useInitialHash'

export default function AppRest() {
  useLayoutEffect(() => {
    syncInitialHash()
  }, [])
  useEffect(() => scheduleHashRealign(), [])

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
