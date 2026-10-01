import type { CSSProperties } from 'react'
import { useI18n } from '@/context/I18nContext'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SectionWrapper } from '@/components/ui/SectionWrapper'
import { SECTION_IDS, SECTION_SHEETS } from '@/lib/constants'
import { useRevealOnce } from '@/hooks/useRevealOnce'
import type { ExperienceItem } from '@/data/types'

export function Experience() {
  const { content } = useI18n()

  return (
    <SectionWrapper id={SECTION_IDS.experience}>
      <SectionHeading title={content.experience.title} label={content.nav.experience} sheet={SECTION_SHEETS.experience} />
      <div className="relative mx-auto max-w-3xl">
        <div
          aria-hidden="true"
          className="absolute left-4 top-0 h-full w-px bg-gradient-to-b from-accent/50 via-cyan/30 to-transparent md:left-1/2 md:w-[2px] md:-translate-x-1/2"
        />

        <div className="space-y-10">
          {content.experience.items.map((item, index) => (
            <ExperienceArticle key={`${item.title}-${item.period}`} item={item} isEven={index % 2 === 0} />
          ))}
        </div>
      </div>
    </SectionWrapper>
  )
}

function ExperienceArticle({ item, isEven }: { item: ExperienceItem; isEven: boolean }) {
  const ref = useRevealOnce<HTMLElement>()

  return (
    <article
      ref={ref}
      data-reveal
      style={{ '--reveal-duration': '0.6s' } as CSSProperties}
      className={`relative md:w-[calc(50%-2rem)] ${
        isEven ? 'md:mr-auto md:pr-8' : 'md:ml-auto md:pl-8'
      }`}
    >
      <div className="absolute left-4 top-6 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-accent bg-background md:left-1/2" />
      <div className="ml-10 rounded-2xl border border-[#d7e2ef] bg-surface/90 p-6 md:ml-0">
        <p className="font-mono text-xs text-accent">{item.period}</p>
        <h3 className="mt-2 text-lg font-medium text-foreground">{item.title}</h3>
        {item.company ? (
          <p className="mt-1 text-sm text-muted">{item.company}</p>
        ) : null}
        <ul className="mt-4 space-y-2">
          {item.bullets.map((bullet) => (
            <li key={bullet} className="flex gap-2 text-sm leading-relaxed text-muted">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-cyan" />
              {bullet}
            </li>
          ))}
        </ul>
      </div>
    </article>
  )
}
