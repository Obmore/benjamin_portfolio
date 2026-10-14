import { useRef } from 'react'
import { useI18n } from '@/context/useI18n'
import { Button } from '@/components/ui/Button'
import { CopyEmailButton } from '@/components/ui/CopyEmailButton'
import { OrderLink } from '@/components/ui/OrderLink'
import { HeroVisual } from '@/components/visuals/HeroVisual'
import { EMAIL, SECTION_IDS } from '@/lib/constants'
import { onResolvedHashClick } from '@/lib/anchors'

export function Hero() {
  const { content } = useI18n()
  const emailRef = useRef<HTMLAnchorElement>(null)

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
            <p className="hero-audience">{content.hero.audience}</p>
            <div className="hero-actions">
              <Button
                href={`/#${SECTION_IDS.packages}`}
                className="hero-btn hero-btn-primary"
                onClick={event => onResolvedHashClick(event, SECTION_IDS.packages)}
              >
                {content.hero.ctaPackages}
              </Button>
              <Button variant="outline" href={`mailto:${EMAIL}`} className="hero-btn hero-btn-email">
                {content.hero.ctaEmail}
              </Button>
            </div>
            <div className="hero-email">
              <a ref={emailRef} href={`mailto:${EMAIL}`} className="hero-email-address">
                {EMAIL}
              </a>
              <CopyEmailButton email={EMAIL} linkRef={emailRef} />
            </div>
            <div className="hero-links">
              <OrderLink className="hero-demo ui-pressable">
                <span aria-hidden="true">↗</span> {content.hero.inquiryLabel}
              </OrderLink>
              <a className="hero-demo ui-pressable" href="/#munka-hotel-rental" onClick={event => onResolvedHashClick(event, 'munka-hotel-rental')}>
                <span aria-hidden="true">↗</span> {content.hero.demoLabel}
              </a>
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
