import type { SiteContent } from './types'

export const contentEn: SiteContent = {
  meta: {
    title: 'Ott Benjámin — Electrical Engineer & Software Developer',
    description:
      'Electrical engineer and software developer connecting engineering systems with modern software solutions. Python, full-stack development, industrial systems, energy and telecommunications R&D.',
  },
  nav: {
    about: 'About',
    services: 'Services',
    experience: 'Experience',
    skills: 'Skills',
    projects: 'Projects',
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
        period: '2026 – present',
        bullets: [
          'Supporting electronics development and system-level engineering tasks.',
          'Applying electrical engineering mindset in a development environment.',
          'Structured analysis and resolution of technical problems.',
        ],
      },
      {
        title: 'Electrical Engineer & Project Manager',
        company: 'Voltrack',
        period: '2025 – present',
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
        period: '2023 – 2025',
        bullets: [
          'Frontend and backend development of web applications.',
          'React, Vite, Tailwind CSS and Ant Design on the frontend.',
          'Backend/API-focused development with C#, Microsoft SQL and Quartz.',
          'Development workflows using Azure DevOps, Git and CI/CD practices.',
        ],
      },
      {
        title: 'Researcher',
        company: 'Ericsson',
        period: '2023 – 2025',
        bullets: [
          'R&D tasks related to quantum communication and QKD systems.',
          'Python-based development and support for measurement/experimental work.',
          'Analysis of software and hardware issues in a telecommunications research environment.',
          'Git-based version control and engineering documentation.',
        ],
      },
      {
        title: 'Independent Developer / Sole Proprietor',
        company: '',
        period: '2024 – present',
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
    text: 'Download my current professional resume or connect with me on LinkedIn.',
    downloadHu: 'Download Hungarian CV',
    downloadEn: 'Download English CV',
    linkedIn: 'LinkedIn',
  },
  services: {
    title: 'A web quote form instead of an Excel order sheet',
    lead: 'I am an electrical engineer and software developer. I turn a downloadable Excel or PDF order sheet, and email-based quoting, into a simple web form on the company’s own site.',
    problem:
      'Manual quoting is slow. The customer downloads, fills in and attaches. The company then retypes what arrived. With a web form the data arrives in one piece, complete.',
    craft:
      'I build the form in code, not from a template, so it can follow the company’s own process.',
    emptyPrice: 'Fixed entry price — coming soon',
    priceSetSuffix: 'one-time (alanyi adómentes)',
    featuredBadge: 'Main offer',
    includesTitle: 'Included',
    packages: [
      {
        id: 'quote-form',
        featured: true,
        title: 'Web quote / order form',
        summary:
          'One form embedded in the company’s existing site. Instead of today’s Excel, PDF or email process, the customer submits the request on the site. I build the form in code, not from a template, so it can follow the company’s own process.',
        includes: [
          'One form embedded in the existing site',
          'Up to 10 fields plus file upload (Excel, PDF, DXF)',
          'Confirmation email to the customer',
          'The submission delivered in one email to the company',
          'One revision round',
        ],
        excludesTitle: 'Not included',
        excludes: ['Price calculation', 'A database', 'Integration with existing systems'],
        excludesNote: 'Those are custom work, priced after an assessment.',
        priceFromConfig: true,
        price: '',
      },
      {
        id: 'intro-site',
        featured: false,
        title: 'Introduction site',
        summary:
          'A short, hand-coded site to present the company. Not a template page builder. The domain stays with the client.',
        includes: [
          'Built in code, not with a template page builder',
          'Up to 6 content sections',
          '6–10 legally cleared photos',
          'A contact form',
          'One revision round',
          'The domain is charged separately, and stays with the client',
          'Works well on a phone',
        ],
        priceFromConfig: false,
        price: '59\u00A0000\u00A0Ft one-time (alanyi adómentes)',
        extra: 'Optional operations: 4\u00A0900\u00A0Ft/hó',
      },
      {
        id: 'custom-app',
        featured: false,
        title: 'Custom solution',
        summary:
          'If you need an instant price calculator, a database, or a link to an existing system, that belongs here.',
        includes: [
          'A short assessment of the task',
          'A price only after that assessment',
          'A hand-coded solution, not a template',
        ],
        priceFromConfig: false,
        price: 'Price after a short assessment',
      },
    ],
    form: {
      title: 'Sample quote request',
      intro: 'Try it. This is how a customer would see it on a manufacturing or cutting-shop site.',
      demoBanner:
        'This is a sample. Sending is not turned on, so nothing is sent.',
      liveBanner: 'Sample form. The submitted request will reach me by email.',
      submit: 'Request a quote',
      submitting: 'Sending…',
      tryAgain: 'Fill in another sample',
      demoSuccess:
        'Thank you. This was a sample, and nothing was sent. On a live form, the confirmation would appear here.',
      liveSuccess: 'Thank you. I have received the request and will reply soon.',
      error: 'Sending did not work this time. Please try again, or write an email.',
      required: 'required',
      optional: 'optional',
      fileHint: 'Excel, PDF or DXF. Up to 5 MB.',
      fileChosen: 'Selected file',
      fields: {
        name: 'Name',
        company: 'Company',
        email: 'Email',
        phone: 'Phone',
        material: 'Material',
        materialPlaceholder: 'Choose a material',
        quantity: 'Quantity',
        notes: 'Dimensions and notes',
        file: 'Drawing or spreadsheet',
        consent: 'I agree that the data I provided may be used to handle this enquiry.',
      },
      materials: [
        { value: 'acel', label: 'Steel' },
        { value: 'aluminium', label: 'Aluminium' },
        { value: 'rozsdamentes', label: 'Stainless steel' },
        { value: 'fa', label: 'Wood' },
        { value: 'egyeb', label: 'Other' },
      ],
      errors: {
        name: 'Please enter your name.',
        company: 'Please enter the company name.',
        email: 'Please enter a valid email address.',
        phone: 'Please enter a phone number.',
        material: 'Please choose a material.',
        quantity: 'Please enter the quantity.',
        notes: 'Please describe the dimensions or add a note.',
        fileType: 'The file must be Excel, PDF or DXF.',
        fileSize: 'The file may be at most 5 MB.',
        consent: 'Please tick the consent box to submit.',
      },
    },
    cta: {
      title: 'Ask for an assessment',
      text: 'If you would like an assessment, send an email. After a short conversation I will say which package fits, and what the work includes.',
      button: 'Go to contact',
    },
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
    text: '© 2026 Ott Benjámin. Electrical Engineering × Software Development.',
  },
  common: {
    sectionLabel: 'section',
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
