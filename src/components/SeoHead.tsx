import { useI18n } from '@/context/I18nContext'
import { EMAIL, LINKEDIN_URL } from '@/lib/constants'

const SITE_URL = 'https://ottbenjamin.hu/'

export function SeoHead() {
  const { content } = useI18n()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Ott Benjámin',
    jobTitle: 'Electrical Engineer & Software Developer',
    email: EMAIL,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Budapest',
      addressCountry: 'HU',
    },
    sameAs: [LINKEDIN_URL],
    url: SITE_URL,
  }

  return (
    <>
      <title>{content.meta.title}</title>
      <meta name="description" content={content.meta.description} />
      <meta property="og:title" content={content.meta.title} />
      <meta property="og:description" content={content.meta.description} />
      <meta name="twitter:card" content="summary" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  )
}
