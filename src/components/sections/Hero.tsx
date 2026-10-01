import type { MouseEvent } from 'react'
import { useI18n } from '@/context/I18nContext'
import { Button } from '@/components/ui/Button'
import { HeroVisual } from '@/components/visuals/HeroVisual'
import {
  CV_EN_FILENAME,
  CV_EN_PATH,
  CV_HU_FILENAME,
  CV_HU_PATH,
  ORDER_HREF,
  SECTION_IDS,
  SHOW_ORDER_LINK,
} from '@/lib/constants'
import { CV_SIZE_LABEL } from '@/lib/cv-size'
import { navigateTo } from '@/lib/anchors'

export function Hero() {
  const { content, locale } = useI18n()
  const cvPath = locale === 'hu' ? CV_HU_PATH : CV_EN_PATH
  const cvFile = locale === 'hu' ? CV_HU_FILENAME : CV_EN_FILENAME

  const onWorkClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    navigateTo(SECTION_IDS.projects)
  }

  return (
    <section id="hero" className="hero-section scroll-mt-16">
      <div className="hero-container">
        <div className="hero-layout">
          <div className="hero-copy" data-hero-copy>
            <h1 className="hero-heading">
              <span className="hero-name">Ott Benjámin</span>
              <span className="hero-headline">{content.hero.headline}</span>
            </h1>
            <p className="hero-sub">{content.hero.subheadline}</p>
            <div className="hero-actions">
              <Button
                href={`#${SECTION_IDS.projects}`}
                className="hero-btn hero-btn-primary"
                onClick={onWorkClick}
              >
                {content.nav.projects}
              </Button>
              <Button
                variant="outline"
                href={cvPath}
                download={cvFile}
                className="hero-btn hero-btn-cv"
              >
                <span className="hero-cv-stack">
                  <span>{content.hero.ctaCv}</span>
                  <span className="hero-cv-meta">{CV_SIZE_LABEL[locale]}</span>
                </span>
              </Button>
              {SHOW_ORDER_LINK ? (
                <Button
                  variant="outline"
                  href={ORDER_HREF}
                  hrefLang="hu"
                  className="hero-btn hero-btn-order"
                >
                  {content.nav.order}
                </Button>
              ) : null}
            </div>
            <ul className="hero-chips">
              {content.hero.chips.map((chip) => (
                <li key={chip} className="hero-chip">
                  {chip}
                </li>
              ))}
            </ul>
          </div>
          <HeroVisual />
        </div>
      </div>
    </section>
  )
}
