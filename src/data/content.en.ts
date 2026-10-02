import type { SiteContent } from './types'

export const contentEn: SiteContent = {
  meta: {
    title: 'Ott Benjámin, electrical engineer and software developer',
    description:
      'Ott Benjámin, electrical engineer and software developer. Python, full-stack development, industrial systems, energy and telecommunications R&D.',
  },
  nav: {
    about: 'About',
    experience: 'Experience',
    skills: 'Skills',
    projects: 'My work',
    cv: 'Resume',
    contact: 'Contact',
  },
  hero: {
    headline:
      'Electrical engineer and software developer connecting engineering systems with modern software solutions.',
    subheadline:
      'Python, full-stack development, industrial communication, energy systems, telecommunications R&D and technical project management in one profile.',
    ctaContact: 'Get in touch',
    ctaCv: 'Download resume',
    ctaLinkedIn: 'LinkedIn profile',
    chips: [
      'Python',
      'React',
      'C#',
      'Azure DevOps',
      'Docker',
      'Linux',
      'TCP/IP',
      'Industrial Systems',
      'Energy',
      'Telecom',
      'R&D',
    ],
  },
  about: {
    title: 'About',
    text: 'I am a software developer and technical project engineer with an electrical engineering background. I am interested in roles where engineering thinking, software development and system-level problem solving come together.\n\nI have worked on web and backend development, Python-based engineering tasks, telecommunications R&D environments, and the technical coordination of industrial and energy projects. My strength is bridging developers, engineers and business stakeholders.',
    highlights: [
      {
        title: 'Engineering systems mindset',
        description:
          'Structured analysis, system-level thinking and a comprehensive approach to technical problems.',
      },
      {
        title: 'Software development background',
        description:
          'Full-stack experience with modern web and backend technologies, plus Python-based engineering development.',
      },
      {
        title: 'Project and partner coordination',
        description:
          'Alignment between developers, engineers and business stakeholders, plus documentation and testing support.',
      },
    ],
  },
  experience: {
    title: 'Professional experience',
    items: [
      {
        title: 'Electronics Development Engineer',
        company: 'HM Elektronikai, Logisztikai és Vagyonkezelő Zrt.',
        period: 'Since 2026',
        bullets: [
          'Supporting electronics development and system-level engineering tasks.',
          'Applying electrical engineering mindset in a development environment.',
          'Structured analysis and resolution of technical problems.',
        ],
      },
      {
        title: 'Electrical Engineer & Project Manager',
        company: 'Voltrack',
        period: 'Since 2025',
        bullets: [
          'Coordination of technical projects related to energy and industrial systems.',
          'Support for industrial communication, data acquisition and remote monitoring tasks.',
          'Alignment with partners, developers and technical stakeholders.',
          'System-level troubleshooting, documentation and testing process support.',
        ],
      },
      {
        title: 'Software Developer',
        company: 'Rollin',
        period: '2023 to 2025',
        bullets: [
          'Frontend and backend development of web applications.',
          'React, Vite, Tailwind CSS and Ant Design on the frontend.',
          'Backend and API development with C#, Microsoft SQL and Quartz.',
          'Development workflows using Azure DevOps, Git and CI/CD practices.',
        ],
      },
      {
        title: 'Researcher',
        company: 'Ericsson',
        period: '2023 to 2025',
        bullets: [
          'R&D tasks related to quantum communication and QKD systems.',
          'Software development in several programming languages and support for measurement and experimental work.',
          'Analysis of software and hardware issues in a telecommunications research environment.',
          'Git-based version control and engineering documentation.',
        ],
      },
      {
        title: 'Independent developer, sole proprietor',
        company: '',
        period: 'Since 2024',
        bullets: [
          'Development of web and technical solutions based on business needs.',
          'Frontend, backend and automation-oriented tasks.',
          'Use of modern development tools and AI-assisted workflows.',
        ],
      },
    ],
  },
  skills: {
    title: 'Technologies & competencies',
    groups: [
      {
        title: 'Software Development',
        skills: [
          'Python',
          'JavaScript',
          'TypeScript',
          'React',
          'Vite',
          'Tailwind CSS',
          'Ant Design',
          'C#',
          'SQL',
        ],
      },
      {
        title: 'Engineering & Systems',
        skills: [
          'Electrical Engineering',
          'Industrial Systems',
          'Energy Systems',
          'Telecommunications',
          'TCP/IP',
          'Modbus',
          'VPN',
          'System Integration',
        ],
      },
      {
        title: 'DevOps & Tools',
        skills: [
          'Azure DevOps',
          'Git',
          'Docker',
          'Linux',
          'CI/CD',
          'Cursor',
          'AI-assisted development',
        ],
      },
      {
        title: 'Project & Communication',
        skills: [
          'Technical Project Management',
          'Documentation',
          'Partner Communication',
          'Testing',
          'Troubleshooting',
          'Requirements Analysis',
        ],
      },
    ],
  },
  projects: {
    title: 'My work',
    indexLabel: 'My work',
    sampleBadge: 'Sample',
    items: [
      {
        id: 'anettesvendi',
        title: 'Anett & Vendi',
        subtitle: 'Wedding invitation and RSVP site',
        site: { label: 'anettesvendi.hu', href: 'https://anettesvendi.hu' },
        paragraphs: [
          'A Hungarian and English site made for a couple’s guests. The guest signs in with the code on their invitation. They can RSVP, give the headcount, meal and accommodation needs, and request a song. Incoming replies collect on an organiser view, where the guest list, seating plan and budget can also be managed. The data can be downloaded as a spreadsheet, so meal needs can go to the caterer and song requests to the DJ.',
        ],
        tech: 'Technology: Vite, TypeScript, custom API, Cloudflare. Design and development: Ott Benjámin.',
        image: 'work/anettesvendi.webp',
        imageWidth: 1280,
        imageHeight: 800,
        alt: 'Anett & Vendi wedding site: beach landing screen with invitation-code entry',
      },
      {
        id: 'lelkiter',
        title: 'Életrendező',
        subtitle: 'Introduction site',
        site: { label: 'lelkiter.hu', href: 'https://lelkiter.hu' },
        paragraphs: [
          'An introduction site for a Budapest helper who works with family constellation, drawing analysis, dream interpretation, massage and homeopathy. It can be read in Hungarian and English, and it presents the practitioner, the services and the blog posts on separate pages. It works well on a phone, and the visitor can get in touch directly by email or phone.',
        ],
        tech: 'Technology: React, Vite, Cloudflare. Design and development: Ott Benjámin.',
        image: 'work/lelkiter.webp',
        imageWidth: 1280,
        imageHeight: 800,
        alt: 'Életrendező introduction site landing screen with contact buttons',
      },
      {
        id: 'hotel-rental',
        title: 'Hotel vehicle rental system',
        subtitle: 'Automated rental of electric scooters and bikes for hotels',
        tag: 'Team project',
        paragraphs: [
          'I worked on the hotel rental web interface, the server-side system, remote control of the e-bikes and the charging station software.',
        ],
        tech: 'Technology: React, TypeScript, .NET, Azure, Raspberry Pi, Python.',
      },
      {
        id: 'lelek-es-nyelv',
        title: 'Lélek & Nyelv',
        subtitle: 'Sample introduction site',
        sample: true,
        site: {
          label: 'obmore.github.io/lelek-es-nyelv-portfolio',
          href: 'https://obmore.github.io/lelek-es-nyelv-portfolio',
        },
        paragraphs: [
          'A sample site for a mental-health helper and English teacher, with the services, how the work together goes, and frequent questions. It was made as a demonstration, not client work.',
        ],
        tech: 'Technology: Next.js, React, Tailwind CSS.',
        image: 'work/lelek-es-nyelv.webp',
        imageWidth: 1280,
        imageHeight: 800,
        alt: 'Lélek & Nyelv sample site landing screen: a sure space, a braver voice',
      },
    ],
  },
  cv: {
    title: 'Resume',
    text: 'Download my professional resume, or find me on LinkedIn.',
    downloadHu: 'Download Hungarian CV',
    downloadEn: 'Download English CV',
    linkedIn: 'LinkedIn',
  },
  contact: {
    title: 'Contact',
    text: 'I am open to opportunities in software development, technical project engineering, industrial/energy systems and R&D.',
    email: 'bendzsiott1998@gmail.com',
    location: 'Budapest, Hungary',
    linkedIn: 'linkedin.com/in/benjaminottee',
    prompt: "Write me an email and I'll get back to you soon.",
    copyAddress: 'Copy address',
    copied: 'Copied',
    copiedAnnouncement: 'Email address copied to clipboard',
  },
  footer: {
    text: '© 2026 Ott Benjámin, electrical engineer and software developer',
  },
  common: {
    emailLabel: 'Email',
    locationLabel: 'Location',
    linkedInLabel: 'LinkedIn',
    menuToggle: 'Open menu',
    langToEn: ', switch to English',
    langToHu: ', switch to Hungarian',
    themeDark: 'Dark mode',
    orderLink: 'Order',
    navMain: 'Main navigation',
    navMobile: 'Mobile navigation',
    skipToContent: 'Skip to content',
    backToTop: 'OB. – Ott Benjámin, back to top',
  },
}
