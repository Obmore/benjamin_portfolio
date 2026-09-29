import { useI18n } from '@/context/I18nContext'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SectionWrapper } from '@/components/ui/SectionWrapper'
import { QuoteRequestForm } from '@/components/sections/QuoteRequestForm'
import { SECTION_IDS, SECTION_NUMBERS } from '@/lib/constants'

export function QuoteDemo() {
  const { content } = useI18n()

  return (
    <SectionWrapper id={SECTION_IDS.quoteDemo}>
      <SectionHeading
        number={SECTION_NUMBERS.quoteDemo}
        title={content.tryIt.title}
        label={content.tryIt.title}
        titleId="quote-form-heading"
        subtitle={content.tryIt.text}
      />
      <div className="crop-marks rounded-[6px] border border-line/25 bg-surface p-5 md:p-8">
        <QuoteRequestForm demoOnly />
      </div>
    </SectionWrapper>
  )
}
