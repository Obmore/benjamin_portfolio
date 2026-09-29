import { useI18n } from '@/context/I18nContext'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SectionWrapper } from '@/components/ui/SectionWrapper'
import { QuoteRequestForm } from '@/components/sections/QuoteRequestForm'
import { Reveal } from '@/components/ui/Reveal'
import { SECTION_IDS, SECTION_NUMBERS } from '@/lib/constants'

export function QuoteDemo() {
  const { content } = useI18n()
  const services = content.services

  return (
    <SectionWrapper id={SECTION_IDS.quoteDemo}>
      <SectionHeading
        number={SECTION_NUMBERS.quoteDemo}
        title={services.form.title}
        label={services.form.title}
        titleId="quote-form-heading"
      />
      <Reveal className="mb-8 max-w-2xl space-y-4 text-muted leading-relaxed">
        <p>{services.problem}</p>
        <p className="border-l-2 border-line pl-4 text-foreground">{services.craft}</p>
        <p>{services.form.intro}</p>
      </Reveal>
      <div className="crop-marks rounded-[6px] border border-line/25 bg-surface p-5 md:p-8">
        <QuoteRequestForm />
      </div>
    </SectionWrapper>
  )
}
