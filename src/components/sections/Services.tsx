import { useI18n } from '@/context/I18nContext'
import { Button } from '@/components/ui/Button'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SectionWrapper } from '@/components/ui/SectionWrapper'
import { PencilUnderline } from '@/components/visuals/PencilUnderline'
import { ProcessDiagram } from '@/components/visuals/ProcessDiagram'
import { FinaleSwitch } from '@/components/visuals/SignalRail'
import {
  EMAIL,
  QUOTE_FORM_PACKAGE_PRICE,
  SECTION_IDS,
  SECTION_NUMBERS,
} from '@/lib/constants'
import type { ServicePackage } from '@/data/types'

export function Services() {
  const { content } = useI18n()
  const services = content.services
  const [before, highlight, after] = splitHighlighted(services.problem, services.problemHighlight)

  return (
    <SectionWrapper id={SECTION_IDS.services} className="py-5 md:py-14">
      <SectionHeading
        number={SECTION_NUMBERS.services}
        title={services.sectionTitle}
        label={content.nav.services}
        compact
      />

      <div className="grid gap-2.5 lg:grid-cols-3 lg:gap-5">
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

      <p className="mt-3 max-w-3xl text-[13px] leading-snug text-muted md:mt-5 md:text-sm md:leading-relaxed">
        {before}
        {highlight ? <PencilUnderline>{highlight}</PencilUnderline> : null}
        {after}
      </p>

      <ProcessDiagram />

      <FinaleSwitch>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 md:mt-5">
          <Button data-cta="assess" href={`#${SECTION_IDS.contact}`}>
            {services.cta.title}
          </Button>
          <p className="text-sm text-foreground">
            <span className="font-mono text-xs text-line">{content.common.emailLabel}</span>{' '}
            <span className="break-all">{EMAIL}</span>
          </p>
        </div>
      </FinaleSwitch>
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
      className={`price-card relative flex h-full flex-col rounded-[6px] border bg-surface p-2.5 md:p-3.5 ${
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
        <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-line md:mb-2 md:text-xs">
          {featuredBadge}
        </p>
      ) : null}
      <h3 className="text-base font-medium text-foreground md:text-lg">{pkg.title}</h3>
      <p
        data-testid={testId}
        data-price={pkg.id === 'quote-form' ? '149000' : undefined}
        className={`price-figure mt-1.5 md:mt-2 ${pending ? 'text-muted' : ''}`}
      >
        {amount}
      </p>
      {note ? <p className="mt-0.5 text-sm text-muted md:mt-1 md:text-base">{note}</p> : null}
      {pkg.extra ? <p className="mt-0.5 text-sm text-muted md:mt-1 md:text-base">{pkg.extra}</p> : null}
      <p className="mt-1.5 text-[13px] leading-snug text-muted md:mt-2 md:text-sm">{pkg.summary}</p>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-line md:mt-3 md:text-xs">
        {includesTitle}
      </p>
      <ul className="mt-1.5 space-y-0.5 md:mt-2 md:space-y-1">
        {pkg.includes.map((item) => (
          <li key={item} className="flex gap-2 text-[13px] leading-snug text-muted md:text-sm md:leading-relaxed">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full border border-line" />
            {item}
          </li>
        ))}
      </ul>
      {pkg.excludes && pkg.excludes.length > 0 ? (
        <div className="mt-2 md:mt-3">
          {pkg.excludesTitle ? (
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted md:text-xs">
              {pkg.excludesTitle}
            </p>
          ) : null}
          <ul className="mt-1.5 space-y-0.5 md:mt-2 md:space-y-1">
            {pkg.excludes.map((item) => (
              <li key={item} className="flex gap-2 text-[13px] leading-snug text-muted md:text-sm md:leading-relaxed">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-border" />
                {item}
              </li>
            ))}
          </ul>
          {pkg.excludesNote ? (
            <p className="mt-1.5 text-[13px] leading-snug text-muted md:mt-2 md:text-sm md:leading-relaxed">
              {pkg.excludesNote}
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}

function splitHighlighted(text: string, highlight: string): [string, string, string] {
  const index = text.indexOf(highlight)
  if (index === -1) return [text, '', '']
  return [text.slice(0, index), highlight, text.slice(index + highlight.length)]
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
