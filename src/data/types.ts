export type Locale = 'hu' | 'en'

export interface NavLink {
  id: string
  label: string
}

export interface ExperienceItem {
  title: string
  company: string
  period: string
  bullets: string[]
}

export interface SkillGroup {
  title: string
  skills: string[]
}

export interface WorkProject {
  id: string
  title: string
  subtitle?: string
  sample?: boolean
  tag?: string
  site?: {
    label: string
    href: string
  }
  paragraphs: string[]
  tech: string
  image?: string
  imageWidth?: number
  imageHeight?: number
  alt?: string
}

export interface HighlightCard {
  title: string
  description: string
}

export interface SiteContent {
  meta: {
    title: string
    description: string
  }
  nav: {
    about: string
    experience: string
    skills: string
    projects: string
    cv: string
    contact: string
  }
  hero: {
    headline: string
    subheadline: string
    ctaContact: string
    ctaCv: string
    ctaLinkedIn: string
    chips: string[]
  }
  about: {
    title: string
    text: string
    highlights: HighlightCard[]
  }
  experience: {
    title: string
    items: ExperienceItem[]
  }
  skills: {
    title: string
    groups: SkillGroup[]
  }
  projects: {
    title: string
    indexLabel: string
    sampleBadge: string
    items: WorkProject[]
  }
  cv: {
    title: string
    text: string
    downloadHu: string
    downloadEn: string
    linkedIn: string
  }
  contact: {
    title: string
    text: string
    email: string
    location: string
    linkedIn: string
    prompt: string
    copyAddress: string
    copied: string
    copiedAnnouncement: string
  }
  footer: {
    text: string
  }
  common: {
    emailLabel: string
    locationLabel: string
    linkedInLabel: string
    menuToggle: string
    langToEn: string
    langToHu: string
    orderLink: string
    navMain: string
    navMobile: string
    skipToContent: string
    backToTop: string
  }
}
