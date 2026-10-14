import { useI18n } from '@/context/useI18n'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SectionWrapper } from '@/components/ui/SectionWrapper'
import { SECTION_IDS, SECTION_SHEETS } from '@/lib/constants'
import { ORDER_HREF } from '@/lib/flags'
import { VAT_LABEL, formatHuf } from '@/data/pricing'
import type { PriceLine } from '@/data/types'

export function Packages() {
  const { content, locale } = useI18n()
  const { packages } = content

  const price = (line: PriceLine) => packages.period[line.period].replace('{amount}', formatHuf(line.amount, locale))

  return (
    <SectionWrapper id={SECTION_IDS.packages}>
      <SectionHeading
        title={packages.title}
        subtitle={packages.intro}
        label={content.nav.packages}
        sheet={SECTION_SHEETS.packages}
      />
      <ol role="list" className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {packages.items.map((item) => (
          <li
            key={item.letter}
            data-package={item.letter}
            className="flex flex-col border border-line bg-surface/90 p-6"
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">
              {packages.sheet} {item.letter}
            </p>
            <h3 className="mt-3 text-lg font-medium text-foreground">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{item.summary}</p>
            <ul role="list" className="mt-4 space-y-1.5 text-sm leading-relaxed text-ink-2">
              {item.facts.map((fact) => (
                <li key={fact} className="flex gap-2">
                  <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 bg-accent" />
                  {fact}
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-6">
              <div className="space-y-3 border-t border-line pt-4 text-sm text-foreground">
                {item.prices.map((line) => (
                  <p key={`${line.amount}-${line.label ?? ''}`}>
                    {line.label ? <span className="block text-muted">{line.label}</span> : null}
                    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                      <strong className="font-semibold tabular-nums">{price(line)}</strong>
                      <span className="whitespace-nowrap border border-line px-1.5 py-0.5 font-mono text-[11px] leading-4 tracking-[0.04em] text-muted">
                        {VAT_LABEL[locale]}
                      </span>
                    </span>
                  </p>
                ))}
                {item.priceNote ? <p>{item.priceNote}</p> : null}
              </div>
              <a
                href={`${ORDER_HREF}#${item.anchor}`}
                className="mt-4 inline-flex min-h-11 items-center gap-1 text-sm text-accent underline underline-offset-4"
              >
                {packages.detailLabel}
                <span className="sr-only">: {item.title}</span>
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          </li>
        ))}
      </ol>
    </SectionWrapper>
  )
}
