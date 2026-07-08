import { useI18n } from '@/context/I18nContext'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SectionWrapper } from '@/components/ui/SectionWrapper'
import { CV_EN_PATH, CV_HU_PATH, LINKEDIN_URL, SECTION_IDS } from '@/lib/constants'

export function CvDownload() {
  const { content } = useI18n()

  return (
    <SectionWrapper id={SECTION_IDS.cv}>
      <SectionHeading title={content.cv.title} />
      <Card className="text-center md:text-left">
        <p className="max-w-2xl text-muted leading-relaxed">{content.cv.text}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3 md:justify-start">
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
      </Card>
    </SectionWrapper>
  )
}
