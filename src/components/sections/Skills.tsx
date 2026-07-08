import { useI18n } from '@/context/I18nContext'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SectionWrapper } from '@/components/ui/SectionWrapper'
import { SECTION_IDS } from '@/lib/constants'

export function Skills() {
  const { content } = useI18n()

  return (
    <SectionWrapper id={SECTION_IDS.skills}>
      <SectionHeading title={content.skills.title} />
      <div className="grid gap-6 md:grid-cols-2">
        {content.skills.groups.map((group, index) => (
          <Card key={group.title} delay={index * 0.08} className="border-t-2 border-t-accent/30">
            <h3 className="text-lg font-medium text-foreground">{group.title}</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {group.skills.map((skill) => (
                <Chip key={skill} label={skill} />
              ))}
            </div>
          </Card>
        ))}
      </div>
    </SectionWrapper>
  )
}
