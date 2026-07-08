import { useI18n } from '@/context/I18nContext'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SectionWrapper } from '@/components/ui/SectionWrapper'
import { ContactForm, ContactInfo } from '@/components/sections/ContactForm'
import { SECTION_IDS } from '@/lib/constants'

export function Contact() {
  const { content } = useI18n()

  return (
    <SectionWrapper id={SECTION_IDS.contact}>
      <SectionHeading title={content.contact.title} />
      <p className="mb-10 max-w-2xl text-muted leading-relaxed">{content.contact.text}</p>
      <div className="grid gap-10 rounded-2xl border border-border/70 bg-surface/50 p-6 backdrop-blur-md md:grid-cols-2 md:p-8">
        <ContactInfo
          email={content.contact.email}
          location={content.contact.location}
          linkedIn={content.contact.linkedIn}
        />
        <ContactForm />
      </div>
    </SectionWrapper>
  )
}
