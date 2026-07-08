import { useI18n } from '@/context/I18nContext'
import { Card } from '@/components/ui/Card'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SectionWrapper } from '@/components/ui/SectionWrapper'
import { SECTION_IDS } from '@/lib/constants'

const icons = [
  <svg key="1" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M4 18V6l8-3 8 3v12l-8 3-8-3Z" stroke="currentColor" strokeWidth="1.5" />
    <path d="M12 3v18M4 6l8 3 8-3" stroke="currentColor" strokeWidth="1.5" />
  </svg>,
  <svg key="2" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>,
  <svg key="3" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="16" cy="16" r="3" stroke="currentColor" strokeWidth="1.5" />
    <path d="M11 8h2a4 4 0 0 1 4 4v2" stroke="currentColor" strokeWidth="1.5" />
  </svg>,
]

export function About() {
  const { content } = useI18n()
  const paragraphs = content.about.text.split('\n\n')

  return (
    <SectionWrapper id={SECTION_IDS.about}>
      <SectionHeading title={content.about.title} />
      <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4 text-muted leading-relaxed">
          {paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 24)}>{paragraph}</p>
          ))}
        </div>
        <div className="grid gap-4">
          {content.about.highlights.map((highlight, index) => (
            <Card key={highlight.title} delay={index * 0.1}>
              <div className="mb-3 text-accent">{icons[index]}</div>
              <h3 className="text-lg font-medium text-foreground">{highlight.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{highlight.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </SectionWrapper>
  )
}
