import { useI18n } from '@/context/I18nContext'
import { Button } from '@/components/ui/Button'
import { QuoteFormMorph } from '@/components/hero/QuoteFormMorph'
import { EMAIL, SECTION_IDS } from '@/lib/constants'
import { scrollToSection } from '@/hooks/useActiveSection'

export function Hero() {
  const { content } = useI18n()

  return (
    <section id="hero" className="relative scroll-mt-16 pt-16 md:pt-20">
      <div className="mx-auto grid w-full max-w-6xl gap-5 px-5 py-4 md:px-8 md:py-8 lg:grid-cols-12 lg:items-start lg:gap-10">
        <div className="lg:col-span-5">
          <p className="font-mono text-xs tracking-wide text-line">Ott Benjámin</p>
          <p className="mt-1 text-sm text-muted">{content.hero.headline}</p>
          <h1 className="mt-3 text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground md:text-4xl">
            {content.services.title}
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
            {content.services.lead}
          </p>
          <div className="mt-5 flex flex-col gap-2 md:flex-row">
            <Button
              data-hero-cta="primary"
              className="w-full md:w-auto"
              onClick={() => scrollToSection(SECTION_IDS.contact)}
            >
              {content.services.cta.title}
            </Button>
            <Button
              data-hero-cta="secondary"
              variant="outline"
              className="w-full md:w-auto"
              onClick={() => scrollToSection(SECTION_IDS.quoteDemo)}
            >
              {content.services.form.title}
            </Button>
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
