import { useI18n } from '@/context/I18nContext'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { HeroVisual } from '@/components/visuals/HeroVisual'
import { TechnicalLines } from '@/components/visuals/TechnicalLines'
import { CV_EN_PATH, CV_HU_PATH, LINKEDIN_URL, SECTION_IDS } from '@/lib/constants'
import { scrollToSection } from '@/hooks/useActiveSection'
import type { CSSProperties } from 'react'

export function Hero() {
  const { content, locale } = useI18n()
  const cvPath = locale === 'hu' ? CV_HU_PATH : CV_EN_PATH

  return (
    <section
      id="hero"
      className="relative flex min-h-screen items-center scroll-mt-24 pt-24"
    >
      <TechnicalLines />
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-16 md:px-8 lg:grid-cols-2 lg:gap-16">
        <div>
          <h1
            className="hero-enter text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl"
            style={{ '--i': 0 } as CSSProperties}
          >
            <span className="block">Ott Benjámin</span>
            <span className="mt-3 block text-2xl font-medium tracking-tight text-muted md:text-3xl">
              {content.hero.headline}
            </span>
          </h1>
          <p
            className="hero-enter mt-6 max-w-xl text-lg leading-relaxed text-muted"
            style={{ '--i': 1 } as CSSProperties}
          >
            {content.hero.subheadline}
          </p>
          <div className="hero-enter mt-8 flex flex-wrap gap-3" style={{ '--i': 2 } as CSSProperties}>
            <Button type="button" onClick={() => scrollToSection(SECTION_IDS.contact)}>
              {content.hero.ctaContact}
            </Button>
            <Button variant="outline" href={cvPath} external>
              {content.hero.ctaCv}
            </Button>
            <Button variant="ghost" href={LINKEDIN_URL} external>
              {content.hero.ctaLinkedIn}
            </Button>
          </div>
          <div className="hero-enter mt-10 flex flex-wrap gap-2" style={{ '--i': 3 } as CSSProperties}>
            {content.hero.chips.map((chip) => (
              <Chip key={chip} label={chip} />
            ))}
          </div>
        </div>

        <div className="hero-visual-enter">
          <HeroVisual />
        </div>
      </div>
    </section>
  )
}
