import { useI18n } from '@/context/I18nContext'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SectionWrapper } from '@/components/ui/SectionWrapper'
import { Oscilloscope } from '@/components/visuals/Oscilloscope'
import { Reveal } from '@/components/ui/Reveal'
import { SECTION_IDS, SECTION_NUMBERS } from '@/lib/constants'

export function About() {
  const { content } = useI18n()
  const paragraphs = content.about.text.split('\n\n')

  return (
    <SectionWrapper id={SECTION_IDS.about}>
      <SectionHeading
        number={SECTION_NUMBERS.about}
        title={content.about.title}
        label={content.nav.about}
      />
      <Oscilloscope />
      <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
        <Reveal className="space-y-4 text-muted leading-relaxed">
          {paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 24)}>{paragraph}</p>
          ))}
        </Reveal>
        <ul className="space-y-5">
          {content.about.highlights.map((highlight) => (
            <li key={highlight.title} className="flex gap-3">
              <span className="mt-1.5 text-line" aria-hidden="true">
                <svg width="12" height="12" viewBox="0 0 12 12">
                  <circle cx="6" cy="6" r="2.5" fill="none" stroke="currentColor" />
                  <path d="M6 1 V11 M1 6 H11" stroke="currentColor" />
                </svg>
              </span>
              <div>
                <h3 className="text-lg font-medium text-foreground">{highlight.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{highlight.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </SectionWrapper>
  )
}
