import { useI18n } from '@/context/I18nContext'
import { Chip } from '@/components/ui/Chip'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SectionWrapper } from '@/components/ui/SectionWrapper'
import { SchematicIcon, type SchematicKind } from '@/components/visuals/SchematicIcon'
import { SECTION_IDS, SECTION_NUMBERS } from '@/lib/constants'

const GROUP_ICONS: SchematicKind[] = ['transistor', 'antenna', 'resistor', 'battery']

export function Skills() {
  const { content } = useI18n()

  return (
    <SectionWrapper id={SECTION_IDS.skills}>
      <SectionHeading
        number={SECTION_NUMBERS.skills}
        title={content.skills.title}
        label={content.nav.skills}
      />
      <div className="grid gap-0 overflow-hidden rounded-[6px] border border-line/25 md:grid-cols-2">
        {content.skills.groups.map((group, index) => (
          <div
            key={group.title}
            className="border-b border-line/20 p-5 last:border-b-0 md:border-r md:[&:nth-child(2n)]:border-r-0 md:[&:nth-last-child(-n+2)]:border-b-0"
          >
            <h3 className="flex items-center gap-2.5 border-b border-line/20 pb-2 text-lg font-medium text-foreground">
              <SchematicIcon kind={GROUP_ICONS[index] ?? 'transistor'} />
              {group.title}
            </h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {group.skills.map((skill) => (
                <Chip key={skill} label={skill} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </SectionWrapper>
  )
}
