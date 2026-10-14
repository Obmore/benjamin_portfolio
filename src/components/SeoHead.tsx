import { useEffect } from 'react'
import { useI18n } from '@/context/useI18n'
import { EMAIL, LINKEDIN_URL } from '@/lib/constants'
import { ORDER_HREF } from '@/lib/flags'
import { AMOUNTS } from '@/data/pricing'
import type { PackageItem } from '@/data/types'

const SITE_URL = 'https://ottbenjamin.hu/'
const PERSON_ID = `${SITE_URL}#person`

function offer(item: PackageItem) {
  const [main] = item.prices
  const price = main
    ? main.period === 'month'
      ? {
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: AMOUNTS[main.amount],
            priceCurrency: 'HUF',
            referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'MON' },
          },
        }
      : { price: AMOUNTS[main.amount], priceCurrency: 'HUF' }
    : { description: item.priceNote }
  return {
    '@type': 'Offer',
    name: item.title,
    url: `${SITE_URL}${ORDER_HREF.slice(1)}#${item.anchor}`,
    itemOffered: { '@type': 'Service', name: item.title, description: item.summary },
    ...price,
  }
}

// index.html ships the Hungarian head tags for crawlers; update them in place so
// the English page does not end up with a second, ignored title or description.
function setMeta(attribute: 'name' | 'property', key: string, value: string) {
  let meta = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute(attribute, key)
    document.head.append(meta)
  }
  meta.content = value
}

export function SeoHead() {
  const { content } = useI18n()
  const { title, description } = content.meta

  useEffect(() => {
    document.title = title
    setMeta('name', 'description', description)
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', description)
    setMeta('name', 'twitter:card', 'summary')
  }, [title, description])

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        '@id': PERSON_ID,
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
      },
      {
        '@type': 'ProfessionalService',
        '@id': `${SITE_URL}#service`,
        name: 'Ott Benjámin egyéni vállalkozó',
        description: content.meta.description,
        url: SITE_URL,
        email: EMAIL,
        founder: { '@id': PERSON_ID },
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'Kossuth utca 32.',
          postalCode: '8944',
          addressLocality: 'Sárhida',
          addressCountry: 'HU',
        },
        areaServed: { '@type': 'Country', name: 'Magyarország' },
        makesOffer: content.packages.items.map(offer),
      },
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
