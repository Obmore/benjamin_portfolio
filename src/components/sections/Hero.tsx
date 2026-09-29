import { useI18n } from '@/context/I18nContext'
import { Button } from '@/components/ui/Button'
import { QuoteFormMorph } from '@/components/hero/QuoteFormMorph'
import { SignalSegment } from '@/components/visuals/SignalRail'
import { EMAIL, SECTION_IDS } from '@/lib/constants'
import { scrollToSection } from '@/hooks/useActiveSection'

export function Hero() {
  const { content } = useI18n()
  const hero = content.hero

  return (
    <section id="hero" className="relative scroll-mt-16 pt-16 md:pt-20">
      <SignalSegment staticDraw />
      <div className="mx-auto grid w-full max-w-6xl gap-3 px-5 py-3 md:gap-5 md:px-8 md:py-8 lg:grid-cols-12 lg:items-start lg:gap-10">
        <div className="lg:col-span-5">
          <div className="flex items-baseline gap-3">
            <p className="font-mono text-xs tracking-wide text-line">Ott Benjámin</p>
            <p className="font-mono text-[10px] tracking-wide text-line">{hero.sheetLabel}</p>
          </div>
          <p className="mt-1 text-sm text-muted">{hero.headline}</p>
          <h1 className="hero-offer-title mt-2 text-[1.5rem] font-semibold leading-[1.22] tracking-tight text-foreground md:mt-3 md:text-4xl md:leading-tight">
            {hero.offerHeadline}
          </h1>
          <p className="hero-offer-lead mt-2 max-w-xl text-[15px] leading-snug text-muted md:mt-3 md:leading-relaxed">
            {hero.offerLead}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 md:mt-5">
            <Button
              data-hero-cta="primary"
              className="w-auto"
              onClick={() => scrollToSection(SECTION_IDS.contact)}
            >
              {content.services.cta.title}
            </Button>
            <a
              data-hero-cta="secondary"
              href={`#${SECTION_IDS.services}`}
              className="inline-flex min-h-12 items-center text-sm font-medium text-line underline-offset-4 hover:underline"
            >
              {hero.pricesJump}
            </a>
          </div>
          <p className="mt-3 text-sm">
            <span className="font-mono text-xs text-line">{content.common.emailLabel}</span>{' '}
            <a
              data-hero-email
              href={`mailto:${EMAIL}`}
              className="break-all text-foreground underline-offset-2 hover:underline"
            >
              {EMAIL}
            </a>
          </p>
        </div>
        <div className="lg:col-span-7">
          <QuoteFormMorph />
        </div>
      </div>
    </section>
  )
}
