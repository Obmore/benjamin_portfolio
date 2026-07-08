import { useI18n } from '@/context/I18nContext'
import { Card } from '@/components/ui/Card'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SectionWrapper } from '@/components/ui/SectionWrapper'
import { SECTION_IDS } from '@/lib/constants'

export function Projects() {
  const { content } = useI18n()

  return (
    <SectionWrapper id={SECTION_IDS.projects}>
      <SectionHeading title={content.projects.title} />
      <div className="grid gap-6 md:grid-cols-2">
        {content.projects.items.map((project, index) => (
          <Card
            key={project.title}
            delay={index * 0.1}
            className="group border-t-2 border-t-cyan/40 transition-colors hover:border-t-accent/60"
          >
            <h3 className="text-lg font-medium text-foreground transition-colors group-hover:text-accent">
              {project.title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">{project.description}</p>
          </Card>
        ))}
      </div>
    </SectionWrapper>
  )
}
