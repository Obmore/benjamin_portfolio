export const LINKEDIN_URL = 'https://www.linkedin.com/in/benjaminottee'
export const EMAIL = 'bendzsiott1998@gmail.com'
export const CV_HU_PATH = `${import.meta.env.BASE_URL}cv/Ott_Benjamin_CV_HU.pdf`
export const CV_EN_PATH = `${import.meta.env.BASE_URL}cv/Ott_Benjamin_CV_EN.pdf`

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
