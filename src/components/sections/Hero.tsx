import { useI18n } from '@/context/I18nContext'
import { OrderLink } from '@/components/ui/OrderLink'
import { HeroVisual } from '@/components/visuals/HeroVisual'

export function Hero() {
  const { content } = useI18n()

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
              <OrderLink className="hero-cta" />
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
