import { useI18n } from '@/context/I18nContext'
import { Button } from '@/components/ui/Button'
import { Panel } from '@/components/ui/Panel'
import { Reveal } from '@/components/ui/Reveal'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SectionWrapper } from '@/components/ui/SectionWrapper'
import { CV_EN_PATH, CV_HU_PATH, LINKEDIN_URL, SECTION_IDS, SECTION_NUMBERS } from '@/lib/constants'

export function CvDownload() {
  const { content } = useI18n()

  return (
    <SectionWrapper id={SECTION_IDS.cv}>
      <SectionHeading
        number={SECTION_NUMBERS.cv}
        title={content.cv.title}
        label={content.nav.cv}
      />
      <Panel>
        <Reveal>
          <p className="max-w-2xl text-muted leading-relaxed">{content.cv.text}</p>
        </Reveal>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button href={CV_HU_PATH} external>
            {content.cv.downloadHu}
          </Button>
          <Button variant="outline" href={CV_EN_PATH} external>
            {content.cv.downloadEn}
          </Button>
          <Button variant="ghost" href={LINKEDIN_URL} external>
            {content.cv.linkedIn}
          </Button>
        </div>
      </Panel>
    </SectionWrapper>
  )
}
