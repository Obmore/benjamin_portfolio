export const LINKEDIN_URL = 'https://www.linkedin.com/in/benjaminottee'
export const EMAIL = 'ott.benjamin.ev@ottbenjamin.hu'
export const CV_HU_PATH = `${import.meta.env.BASE_URL}cv/Ott_Benjamin_CV_HU.pdf`
export const CV_EN_PATH = `${import.meta.env.BASE_URL}cv/Ott_Benjamin_CV_EN.pdf`
export const CV_HU_FILENAME = 'Ott_Benjamin_CV_HU.pdf'
export const CV_EN_FILENAME = 'Ott_Benjamin_CV_EN.pdf'

export const SECTION_IDS = {
  packages: 'csomagok',
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
  hero: '01/08',
  packages: '02/08',
  projects: '03/08',
  about: '04/08',
  experience: '05/08',
  skills: '06/08',
  cv: '07/08',
  contact: '08/08',
} as const
