import { Helmet } from 'react-helmet-async'
import { useI18n } from '@/context/I18nContext'
import { EMAIL, LINKEDIN_URL } from '@/lib/constants'

export function SeoHead() {
  const { content, locale } = useI18n()
  const siteUrl = 'https://obmore.github.io/benjamin_portfolio/'

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
    url: siteUrl,
  }

  return (
    <Helmet>
      <html lang={locale} />
      <title>{content.meta.title}</title>
      <meta name="description" content={content.meta.description} />
      <meta property="og:title" content={content.meta.title} />
      <meta property="og:description" content={content.meta.description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={siteUrl} />
      <meta name="twitter:card" content="summary" />
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </Helmet>
  )
}
