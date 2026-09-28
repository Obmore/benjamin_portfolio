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
  relation?: string
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
  links?: { label: string; href: string }[]
}

export interface HighlightCard {
  title: string
  description: string
}

export interface ServicePackage {
  id: string
  featured: boolean
  title: string
  summary: string
  includes: string[]
  excludesTitle?: string
  excludes?: string[]
  excludesNote?: string
  priceFromConfig: boolean
  price: string
  priceNote?: string
  extra?: string
}

export interface QuoteFormCopy {
  title: string
  intro: string
  demoBanner: string
  liveBanner: string
  submit: string
  submitting: string
  tryAgain: string
  demoSuccess: string
  liveSuccess: string
  error: string
  required: string
  optional: string
  fileHint: string
  fileChoose: string
  fileNone: string
  previewTitle: string
  previewTo: string
  previewSubject: string
  sampleName: string
  sampleCompany: string
  sampleEmail: string
  samplePhone: string
  fields: {
    name: string
    company: string
    email: string
    phone: string
    material: string
    materialPlaceholder: string
    quantity: string
    notes: string
    file: string
    consent: string
  }
  materials: { value: string; label: string }[]
  errors: {
    name: string
    company: string
    email: string
    phone: string
    material: string
    quantity: string
    notes: string
    fileType: string
    fileSize: string
    consent: string
  }
}

export interface SiteContent {
  meta: {
    title: string
    description: string
  }
  nav: {
    about: string
    services: string
    experience: string
    skills: string
    projects: string
    cv: string
    contact: string
  }
  hero: {
    headline: string
    subheadline: string
    offerHeadline: string
    offerLead: string
    pricesJump: string
    sheetLabel: string
    ctaContact: string
    ctaCv: string
    ctaLinkedIn: string
    chips: string[]
    morphAria: string
    morphFile: string
    morphDim: string
    compareBefore: string
    compareAfter: string
    compareAria: string
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
    sampleBadge: string
    explode: {
      structure: string
      content: string
      finished: string
    }
    items: WorkProject[]
  }
  cv: {
    title: string
    text: string
    downloadHu: string
    downloadEn: string
    linkedIn: string
  }
  services: {
    title: string
    sectionTitle: string
    lead: string
    problem: string
    problemHighlight: string
    craft: string
    processTitle: string
    processSteps: { title: string; description: string }[]
    emptyPrice: string
    priceSetSuffix: string
    featuredBadge: string
    includesTitle: string
    packages: ServicePackage[]
    form: QuoteFormCopy
    cta: {
      title: string
      text: string
      button: string
    }
  }
  contact: {
    title: string
    text: string
    email: string
    location: string
    linkedIn: string
  }
  footer: {
    text: string
    sourceLabel: string
  }
  common: {
    emailLabel: string
    locationLabel: string
    linkedInLabel: string
    menuToggle: string
    themeToDark: string
    themeToLight: string
    langToEn: string
    langToHu: string
    mainNav: string
    mobileMenu: string
    closeMenu: string
    skipToContent: string
    copyEmail: string
    emailCopied: string
  }
}
