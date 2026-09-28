export const LINKEDIN_URL = 'https://www.linkedin.com/in/benjaminottee'
export const EMAIL = 'bendzsiott1998@gmail.com'
export const GITHUB_URL = 'https://github.com/Obmore/benjamin_portfolio'
export const GITHUB_LABEL = 'github.com/Obmore/benjamin_portfolio'
export const CV_HU_PATH = `${import.meta.env.BASE_URL}cv/Ott_Benjamin_CV_HU.pdf`
export const CV_EN_PATH = `${import.meta.env.BASE_URL}cv/Ott_Benjamin_CV_EN.pdf`

/**
 * Fixed entry price for the main quote-form package.
 * Use a non-breaking space (U+00A0) as thousands separator and before Ft.
 * Empty string = not published yet. Never invent a number.
 */
export const QUOTE_FORM_PACKAGE_PRICE = '149\u00A0000\u00A0Ft'

/** Form backend URL (Web3Forms, Formspree, or similar). Empty = demo mode. */
export const QUOTE_FORM_ENDPOINT = import.meta.env.VITE_QUOTE_FORM_ENDPOINT?.trim() ?? ''

/** Optional access key (Web3Forms). Never hardcode a real key. */
export const QUOTE_FORM_ACCESS_KEY = import.meta.env.VITE_QUOTE_FORM_ACCESS_KEY?.trim() ?? ''

export function isQuoteFormLive(): boolean {
  return QUOTE_FORM_ENDPOINT.length > 0
}

export function quoteFormPackagePriceLabel(emptyLabel: string, setSuffix = ''): string {
  const value = QUOTE_FORM_PACKAGE_PRICE.trim()
  if (value === '') return emptyLabel
  return setSuffix ? `${value} ${setSuffix}` : value
}

export const SECTION_IDS = {
  about: 'rolam',
  services: 'szolgaltatasok',
  experience: 'tapasztalat',
  skills: 'kompetenciak',
  projects: 'munkaim',
  cv: 'oneletrajz',
  contact: 'kapcsolat',
  quoteDemo: 'ajanlatkero-minta',
} as const

export const SECTION_NUMBERS = {
  services: '01',
  projects: '02',
  quoteDemo: '03',
  about: '04',
  experience: '05',
  skills: '06',
  cv: '07',
  contact: '08',
} as const
