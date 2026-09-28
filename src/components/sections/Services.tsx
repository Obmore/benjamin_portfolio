import { useI18n } from '@/context/I18nContext'
import { Button } from '@/components/ui/Button'
import { Panel } from '@/components/ui/Panel'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SectionWrapper } from '@/components/ui/SectionWrapper'
import {
  EMAIL,
  QUOTE_FORM_PACKAGE_PRICE,
  SECTION_IDS,
  SECTION_NUMBERS,
} from '@/lib/constants'
import { scrollToSection } from '@/hooks/useActiveSection'
import type { ServicePackage } from '@/data/types'

export function Services() {
  const { content } = useI18n()
  const services = content.services

  return (
    <SectionWrapper id={SECTION_IDS.services}>
      <SectionHeading
        number={SECTION_NUMBERS.services}
        title={services.sectionTitle}
        label={content.nav.services}
      />

      <div className="grid gap-3 lg:grid-cols-3 lg:gap-5">
        {services.packages.map((pkg) => (
          <PriceCard
            key={pkg.id}
            pkg={pkg}
            featuredBadge={services.featuredBadge}
            includesTitle={services.includesTitle}
            emptyPrice={services.emptyPrice}
            priceSetSuffix={services.priceSetSuffix}
          />
        ))}
      </div>

      <Panel className="mt-5">
        <h3 className="text-xl font-semibold tracking-tight text-foreground">
          {services.cta.title}
        </h3>
        <p className="mt-3 max-w-2xl text-muted leading-relaxed">{services.cta.text}</p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Button
            data-cta="assess"
            type="button"
            onClick={() => scrollToSection(SECTION_IDS.contact)}
          >
            {services.cta.title}
          </Button>
          <p className="text-sm">
            <span className="font-mono text-xs text-line">{content.common.emailLabel}</span>{' '}
            <a href={`mailto:${EMAIL}`} className="break-all text-foreground hover:underline">
              {EMAIL}
            </a>
          </p>
          <Button
            type="button"
            variant="ghost"
            onClick={() => scrollToSection(SECTION_IDS.contact)}
          >
            {services.cta.button}
          </Button>
        </div>
      </Panel>
    </SectionWrapper>
  )
}

interface PriceCardProps {
  pkg: ServicePackage
  featuredBadge: string
  includesTitle: string
  emptyPrice: string
  priceSetSuffix: string
}

function PriceCard({
  pkg,
  featuredBadge,
  includesTitle,
  emptyPrice,
  priceSetSuffix,
}: PriceCardProps) {
  const pending = pkg.priceFromConfig && QUOTE_FORM_PACKAGE_PRICE.trim() === ''
  const { amount, note } = splitPrice(pkg, emptyPrice, priceSetSuffix)
  const testId = pkg.id === 'quote-form' ? 'price-quote-form' : `price-${pkg.id}`

  return (
    <article
      className={`price-card relative flex h-full flex-col rounded-[6px] border bg-surface p-3.5 ${
        pkg.featured ? 'border-line/60' : 'border-line/25'
      }`}
    >
      <svg className="spec-hover-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path d="M4 4 H28" />
        <path d="M4 4 V20" />
        <path d="M96 4 H72" />
        <path d="M96 4 V20" />
        <path d="M4 96 H28" />
        <path d="M4 96 V80" />
        <path d="M96 96 H72" />
        <path d="M96 96 V80" />
      </svg>
      {pkg.featured ? (
        <p className="mb-2 font-mono text-xs uppercase tracking-wider text-line">{featuredBadge}</p>
      ) : null}
      <h3 className="text-lg font-medium text-foreground">{pkg.title}</h3>
      <p
        data-testid={testId}
        data-price={pkg.id === 'quote-form' ? '149000' : undefined}
        className={`price-figure mt-2 ${pending ? 'text-muted' : ''}`}
      >
        {amount}
      </p>
      {note ? <p className="mt-1 text-base text-muted">{note}</p> : null}
      {pkg.extra ? <p className="mt-1 text-base text-muted">{pkg.extra}</p> : null}
      <p className="mt-2 text-sm leading-snug text-muted">{pkg.summary}</p>
      <p className="mt-3 font-mono text-xs uppercase tracking-wider text-line">{includesTitle}</p>
      <ul className="mt-2 space-y-1">
        {pkg.includes.map((item) => (
          <li key={item} className="flex gap-2 text-sm leading-relaxed text-muted">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full border border-line" />
            {item}
          </li>
        ))}
      </ul>
      {pkg.excludes && pkg.excludes.length > 0 ? (
        <div className="mt-3">
          {pkg.excludesTitle ? (
            <p className="font-mono text-xs uppercase tracking-wider text-muted">{pkg.excludesTitle}</p>
          ) : null}
          <ul className="mt-2 space-y-1">
            {pkg.excludes.map((item) => (
              <li key={item} className="flex gap-2 text-sm leading-relaxed text-muted">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-border" />
                {item}
              </li>
            ))}
          </ul>
          {pkg.excludesNote ? (
            <p className="mt-2 text-sm leading-relaxed text-muted">{pkg.excludesNote}</p>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}

function splitPrice(pkg: ServicePackage, emptyPrice: string, priceSetSuffix: string) {
  if (pkg.priceFromConfig) {
    const value = QUOTE_FORM_PACKAGE_PRICE.trim()
    if (!value) return { amount: emptyPrice, note: undefined }
    return { amount: value, note: priceSetSuffix }
  }

  const match = pkg.price.match(/^(.*?)(?:\s+)(egyszeri|one-time)$/i)
  if (match?.[1] && match[2]) {
    return { amount: match[1], note: match[2] }
  }

  return { amount: pkg.price, note: pkg.priceNote }
}
