export const LINKEDIN_URL = 'https://www.linkedin.com/in/benjaminottee'
export const EMAIL = 'bendzsiott1998@gmail.com'
export const CV_HU_PATH = `${import.meta.env.BASE_URL}cv/Ott_Benjamin_CV_HU.pdf`
export const CV_EN_PATH = `${import.meta.env.BASE_URL}cv/Ott_Benjamin_CV_EN.pdf`
export const CV_HU_FILENAME = 'Ott_Benjamin_CV_HU.pdf'
export const CV_EN_FILENAME = 'Ott_Benjamin_CV_EN.pdf'

export const ORDER_HREF = '/megrendeles/'

export const SECTION_IDS = {
  about: 'rolam',
  experience: 'tapasztalat',
  skills: 'kompetenciak',
  projects: 'munkaim',
  cv: 'oneletrajz',
  contact: 'kapcsolat',
} as const

export const ANCHOR_ALIASES: Record<string, string> = {
  projektek: 'munkaim',
}

export const SECTION_SHEETS = {
  hero: '01/07',
  projects: '02/07',
  about: '03/07',
  experience: '04/07',
  skills: '05/07',
  cv: '06/07',
  contact: '07/07',
} as const
