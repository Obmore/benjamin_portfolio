import { useI18n } from '@/context/I18nContext'
import { Button } from '@/components/ui/Button'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SectionWrapper } from '@/components/ui/SectionWrapper'
import { EMAIL, LINKEDIN_URL, SECTION_IDS } from '@/lib/constants'

export function Contact() {
  const { content } = useI18n()

  return (
    <SectionWrapper id={SECTION_IDS.contact}>
      <SectionHeading title={content.contact.title} label={content.nav.contact} />
      <p className="mb-10 max-w-2xl text-muted leading-relaxed">{content.contact.text}</p>
      <div className="max-w-xl space-y-6 rounded-2xl border border-border/70 bg-surface/50 p-6 backdrop-blur-md md:p-8">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-accent">
            {content.common.emailLabel}
          </p>
          <Button href={`mailto:${EMAIL}`} className="mt-3 max-w-full break-all">
            {EMAIL}
          </Button>
        </div>
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-accent">
            {content.common.locationLabel}
          </p>
          <p className="mt-1 text-foreground">{content.contact.location}</p>
        </div>
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-accent">
            {content.common.linkedInLabel}
          </p>
          <a
            href={LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block break-all text-foreground hover:text-accent"
          >
            {content.contact.linkedIn}
          </a>
        </div>
      </div>
    </SectionWrapper>
  )
}
