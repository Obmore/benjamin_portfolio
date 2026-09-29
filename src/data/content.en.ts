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
    projects: 'Projects',
    cv: 'Resume',
    contact: 'Contact',
  },
  hero: {
    headline: 'electrical engineer and software developer',
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
    title: 'Key professional areas',
    items: [
      {
        title: 'Industrial systems & remote monitoring',
        description:
          'Support for communication, data acquisition and integration tasks in industrial and energy systems.',
      },
      {
        title: 'Python-based engineering development',
        description:
          'Python solutions supporting measurement, data processing and experimental tasks.',
      },
      {
        title: 'Full-stack web development',
        description:
          'Frontend and backend development experience with modern web technologies.',
      },
      {
        title: 'Telecommunications R&D',
        description:
          'Research and development engineering experience related to quantum communication and QKD systems.',
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
    form: {
      name: 'Name',
      email: 'Email',
      message: 'Message',
      submit: 'Send message',
      success: 'Thank you for your message! I will get back to you soon.',
      errors: {
        name: 'Please enter your name.',
        email: 'Please enter a valid email address.',
        message: 'Please write your message.',
      },
    },
  },
  footer: {
    text: '© 2026 Ott Benjámin, electrical engineer and software developer',
  },
  common: {
    emailLabel: 'Email',
    locationLabel: 'Location',
    linkedInLabel: 'LinkedIn',
    menuToggle: 'Open menu',
    themeToDark: 'Switch to dark mode',
    themeToLight: 'Switch to light mode',
    langToEn: 'Switch to English',
    langToHu: 'Switch to Hungarian',
  },
}
