import { useI18n } from '@/context/I18nContext'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SectionWrapper } from '@/components/ui/SectionWrapper'
import { CompareSlider } from '@/components/visuals/CompareSlider'
import { SECTION_IDS, SECTION_NUMBERS } from '@/lib/constants'

export function Solution() {
  const { content } = useI18n()

  return (
    <SectionWrapper id={SECTION_IDS.solution}>
      <SectionHeading
        number={SECTION_NUMBERS.solution}
        title={content.solution.title}
        label={content.nav.howItWorks}
      />
      <p className="mb-6 max-w-3xl text-muted leading-relaxed">{content.solution.text}</p>
      <div className="mx-auto max-w-3xl">
        <CompareSlider autoSweep />
      </div>
    </SectionWrapper>
  )
}
