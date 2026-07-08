import { motion } from 'framer-motion'
import { useI18n } from '@/context/I18nContext'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { HeroVisual } from '@/components/visuals/HeroVisual'
import { TechnicalLines } from '@/components/visuals/TechnicalLines'
import { CV_HU_PATH, LINKEDIN_URL, SECTION_IDS } from '@/lib/constants'
import { scrollToSection } from '@/hooks/useActiveSection'

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
}

const item = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
}

export function Hero() {
  const { content } = useI18n()

  return (
    <section
      id="hero"
      className="relative flex min-h-screen items-center scroll-mt-24 pt-24"
    >
      <TechnicalLines />
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-16 md:px-8 lg:grid-cols-2 lg:gap-16">
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.p variants={item} className="mb-4 font-mono text-sm text-accent">
            Ott Benjámin
          </motion.p>
          <motion.h1
            variants={item}
            className="text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl"
          >
            {content.hero.headline}
          </motion.h1>
          <motion.p variants={item} className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
            {content.hero.subheadline}
          </motion.p>
          <motion.div variants={item} className="mt-8 flex flex-wrap gap-3">
            <Button type="button" onClick={() => scrollToSection(SECTION_IDS.contact)}>
              {content.hero.ctaContact}
            </Button>
            <Button
              variant="outline"
              href={CV_HU_PATH}
              external
            >
              {content.hero.ctaCv}
            </Button>
            <Button variant="ghost" href={LINKEDIN_URL} external>
              {content.hero.ctaLinkedIn}
            </Button>
          </motion.div>
          <motion.div variants={item} className="mt-10 flex flex-wrap gap-2">
            {content.hero.chips.map((chip) => (
              <Chip key={chip} label={chip} />
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <HeroVisual />
        </motion.div>
      </div>
    </section>
  )
}
