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
  previewFileNone: string
  previewQuantityUnit: string
  previewTitle: string
  previewFrom: string
  previewTo: string
  previewRecipient: string
  previewSubjectLabel: string
  previewSubject: string
  sampleName: string
  sampleCompany: string
  sampleEmail: string
  samplePhone: string
  sampleQuantity: string
  sampleNotes: string
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

export interface PaperRow {
  label: string
  value: string
}

export interface ProblemCard {
  text: string
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
    howItWorks: string
    prices: string
  }
  hero: {
    kicker: string
    headline: string
    headlineLines: [string, string]
    subheadline: string
    ctaAssess: string
    ctaHow: string
    scrollHint: string
    paperTitle: string
    paperRows: PaperRow[]
    pricesJump: string
    sheetLabel: string
    ctaContact: string
    ctaCv: string
    ctaLinkedIn: string
    chips: string[]
    morphAria: string
    morphFile: string
    compareBefore: string
    compareAfter: string
    compareAria: string
    inboxLabel: string
  }
  rail: { id: string; label: string }[]
  problem: {
    title: string
    cards: ProblemCard[]
  }
  solution: {
    title: string
    text: string
  }
  tryIt: {
    title: string
    text: string
  }
  process: {
    title: string
    lead: string
  }
  prices: {
    title: string
    lead: string
  }
  marquee: string[]
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
    lead: string
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
    orWrite: string
    finale: string
    email: string
    location: string
    linkedIn: string
    mailSubject: string
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
