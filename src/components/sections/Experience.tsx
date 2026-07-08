import { motion } from 'framer-motion'
import { useI18n } from '@/context/I18nContext'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SectionWrapper } from '@/components/ui/SectionWrapper'
import { SECTION_IDS } from '@/lib/constants'

export function Experience() {
  const { content } = useI18n()

  return (
    <SectionWrapper id={SECTION_IDS.experience}>
      <SectionHeading title={content.experience.title} />
      <div className="relative mx-auto max-w-3xl">
        <div
          aria-hidden="true"
          className="absolute left-4 top-0 hidden h-full w-px bg-gradient-to-b from-accent/50 via-cyan/30 to-transparent md:left-1/2 md:block md:-translate-x-1/2"
        />

        <div className="space-y-10">
          {content.experience.items.map((item, index) => {
            const isEven = index % 2 === 0

            return (
              <motion.article
                key={`${item.title}-${item.period}`}
                initial={{ opacity: 0, x: isEven ? -40 : 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className={`relative md:w-[calc(50%-2rem)] ${
                  isEven ? 'md:mr-auto md:pr-8' : 'md:ml-auto md:pl-8'
                }`}
              >
                <div className="absolute left-4 top-6 hidden h-3 w-3 -translate-x-1/2 rounded-full border-2 border-accent bg-background md:left-1/2 md:block" />
                <div className="ml-10 rounded-2xl border border-border/70 bg-surface/70 p-6 backdrop-blur-md md:ml-0">
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
              </motion.article>
            )
          })}
        </div>
      </div>
    </SectionWrapper>
  )
}
