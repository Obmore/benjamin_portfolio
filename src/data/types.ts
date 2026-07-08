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

export interface ProjectCard {
  title: string
  description: string
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
    items: ProjectCard[]
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
    form: {
      name: string
      email: string
      message: string
      submit: string
      success: string
      errors: {
        name: string
        email: string
        message: string
      }
    }
  }
  footer: {
    text: string
  }
  common: {
    sectionLabel: string
    emailLabel: string
    locationLabel: string
    linkedInLabel: string
    menuToggle: string
    themeToDark: string
    themeToLight: string
    langToEn: string
    langToHu: string
  }
}
