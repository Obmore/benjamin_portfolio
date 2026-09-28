export const LINKEDIN_URL = 'https://www.linkedin.com/in/benjaminottee'
export const EMAIL = 'bendzsiott1998@gmail.com'
export const CV_HU_PATH = `${import.meta.env.BASE_URL}cv/Ott_Benjamin_CV_HU.pdf`
export const CV_EN_PATH = `${import.meta.env.BASE_URL}cv/Ott_Benjamin_CV_EN.pdf`

/**
 * Fixed entry price for the main quote-form package.
 * Keep empty until Benjámin sets it. Never invent a number.
 */
export const QUOTE_FORM_PACKAGE_PRICE = ''

/** Form backend URL (Web3Forms, Formspree, or similar). Empty = demo mode. */
export const QUOTE_FORM_ENDPOINT = import.meta.env.VITE_QUOTE_FORM_ENDPOINT?.trim() ?? ''

/** Optional access key (Web3Forms). Never hardcode a real key. */
export const QUOTE_FORM_ACCESS_KEY = import.meta.env.VITE_QUOTE_FORM_ACCESS_KEY?.trim() ?? ''

export function isQuoteFormLive(): boolean {
  return QUOTE_FORM_ENDPOINT.length > 0
}

export function quoteFormPackagePriceLabel(emptyLabel: string): string {
  const value = QUOTE_FORM_PACKAGE_PRICE.trim()
  return value === '' ? emptyLabel : value
}

export const SECTION_IDS = {
  about: 'rolam',
  services: 'szolgaltatasok',
  experience: 'tapasztalat',
  skills: 'kompetenciak',
  projects: 'projektek',
  cv: 'oneletrajz',
  contact: 'kapcsolat',
} as const
