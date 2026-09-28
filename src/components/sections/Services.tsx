import { useI18n } from '@/context/I18nContext'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SectionWrapper } from '@/components/ui/SectionWrapper'
import { QuoteRequestForm } from '@/components/sections/QuoteRequestForm'
import {
  EMAIL,
  QUOTE_FORM_PACKAGE_PRICE,
  SECTION_IDS,
  quoteFormPackagePriceLabel,
} from '@/lib/constants'
import { scrollToSection } from '@/hooks/useActiveSection'
import type { ServicePackage } from '@/data/types'

export function Services() {
  const { content } = useI18n()
  const services = content.services

  return (
    <SectionWrapper id={SECTION_IDS.services}>
      <SectionHeading title={services.title} />
      <div className="mb-12 max-w-2xl space-y-4 text-muted leading-relaxed">
        <p>{services.lead}</p>
        <p>{services.problem}</p>
        <p className="border-l-2 border-accent/60 pl-4 text-foreground">{services.craft}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {services.packages.map((pkg, index) => (
          <PackageCard
            key={pkg.id}
            pkg={pkg}
            delay={index * 0.08}
            featuredBadge={services.featuredBadge}
            includesTitle={services.includesTitle}
            emptyPrice={services.emptyPrice}
          />
        ))}
      </div>

      <div className="mt-16">
        <h3 id="quote-form-heading" className="text-2xl font-semibold tracking-tight text-foreground">
          {services.form.title}
        </h3>
        <p className="mt-3 mb-8 max-w-2xl text-muted leading-relaxed">{services.form.intro}</p>
        <Card className="max-w-3xl">
          <QuoteRequestForm />
        </Card>
      </div>

      <Card className="mt-10">
        <h3 className="text-xl font-semibold tracking-tight text-foreground">{services.cta.title}</h3>
        <p className="mt-3 max-w-2xl text-muted leading-relaxed">{services.cta.text}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="button" onClick={() => scrollToSection(SECTION_IDS.contact)}>
            {services.cta.button}
          </Button>
          <Button variant="outline" href={`mailto:${EMAIL}`}>
            {EMAIL}
          </Button>
        </div>
      </Card>
    </SectionWrapper>
  )
}

interface PackageCardProps {
  pkg: ServicePackage
  delay: number
  featuredBadge: string
  includesTitle: string
  emptyPrice: string
}

function PackageCard({ pkg, delay, featuredBadge, includesTitle, emptyPrice }: PackageCardProps) {
  const price = pkg.priceFromConfig ? quoteFormPackagePriceLabel(emptyPrice) : pkg.price
  const pricePending = pkg.priceFromConfig && QUOTE_FORM_PACKAGE_PRICE.trim() === ''

  return (
    <Card
      delay={delay}
      className={`flex h-full flex-col ${
        pkg.featured ? 'border-accent/50 ring-1 ring-accent/20' : ''
      }`}
    >
      {pkg.featured ? (
        <p className="mb-3 font-mono text-xs uppercase tracking-wider text-accent">{featuredBadge}</p>
      ) : null}
      <h3 className="text-lg font-medium text-foreground">{pkg.title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-muted">{pkg.summary}</p>
      <p className="mt-5 font-mono text-xs uppercase tracking-wider text-accent">{includesTitle}</p>
      <ul className="mt-3 space-y-2">
        {pkg.includes.map((item) => (
          <li key={item} className="flex gap-2 text-sm leading-relaxed text-muted">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-cyan" />
            {item}
          </li>
        ))}
      </ul>
      {pkg.excludes && pkg.excludes.length > 0 ? (
        <div className="mt-5">
          {pkg.excludesTitle ? (
            <p className="font-mono text-xs uppercase tracking-wider text-muted">{pkg.excludesTitle}</p>
          ) : null}
          <ul className="mt-3 space-y-2">
            {pkg.excludes.map((item) => (
              <li key={item} className="flex gap-2 text-sm leading-relaxed text-muted">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-border" />
                {item}
              </li>
            ))}
          </ul>
          {pkg.excludesNote ? (
            <p className="mt-3 text-sm leading-relaxed text-muted">{pkg.excludesNote}</p>
          ) : null}
        </div>
      ) : null}
      <div className="mt-auto pt-6">
        <p className={`text-lg font-medium ${pricePending ? 'text-muted' : 'text-foreground'}`}>
          {price}
        </p>
        {pkg.priceNote ? <p className="mt-1 text-sm text-muted">{pkg.priceNote}</p> : null}
        {pkg.extra ? <p className="mt-2 text-sm text-muted">{pkg.extra}</p> : null}
      </div>
    </Card>
  )
}
