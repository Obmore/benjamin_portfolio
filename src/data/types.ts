import type { AmountKey } from './pricing'

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

export interface PriceLine {
  label?: string
  amount: AmountKey
  period: 'once' | 'month'
}

export interface PackageItem {
  letter: 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
  /** Card id on /megrendeles/. */
  anchor: string
  title: string
  summary: string
  facts: string[]
  prices: PriceLine[]
  /** Pricing for work without a fixed amount, as worded on /megrendeles/. */
  priceNote?: string
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
    packages: string
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
    audience: string
    ctaPackages: string
    ctaEmail: string
    demoLabel: string
    inquiryLabel: string
    chips: string[]
  }
  packages: {
    title: string
    intro: string
    sheet: string
    detailLabel: string
    /** "{amount}" is replaced with the formatted price. */
    period: Record<PriceLine['period'], string>
    items: PackageItem[]
  }
  about: {
    title: string
    text: string
    highlights: HighlightCard[]
    moreLabel: string
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
    detailLabels: string[]
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
    privacy: string
    imprint: string
    imprintHref: string
    terms: string
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
    navLegal: string
    skipToContent: string
    backToTop: string
  }
}
