import type { SiteContent } from './types'

// EN-REVIEW: new sentences are a faithful draft of the approved HU copy.
// They are marked in comments so a language reviewer can edit them separately.

export const contentEn: SiteContent = {
  meta: {
    title: 'Ott Benjámin, electrical engineer and software developer',
    description:
      'Ott Benjámin, electrical engineer and software developer. Python, full-stack development, industrial systems, energy and telecommunications R&D.',
  },
  nav: {
    about: 'About',
    services: 'Services',
    experience: 'Experience',
    skills: 'Skills',
    projects: 'My work',
    cv: 'Resume',
    contact: 'Contact',
    howItWorks: 'How it works', // EN-REVIEW
    prices: 'Prices', // EN-REVIEW
  },
  hero: {
    kicker: 'Ott Benjámin, electrical engineer and software developer', // EN-REVIEW
    headline: 'A good order starts with a form filled in well.', // EN-REVIEW
    headlineLines: ['A good order starts', 'with a form filled in well.'], // EN-REVIEW
    subheadline:
      'I make web quote forms and order forms so your customers give you everything you need the first time.', // EN-REVIEW
    ctaAssess: 'Ask for an assessment', // EN-REVIEW
    ctaHow: 'See how it works', // EN-REVIEW
    scrollHint: 'Scroll on', // EN-REVIEW
    paperTitle: 'Order form', // EN-REVIEW
    paperRows: [
      { label: 'Size', value: '1200 × 800 mm' },
      { label: 'Quantity', value: '12' },
      { label: 'Notes', value: 'Oak, lacquered' },
    ],
    pricesJump: 'Prices',
    sheetLabel: 'Sheet 1',
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
    morphAria:
      'Illustration: the lines of a handwritten order form become the fields of a web quote form.', // EN-REVIEW
    morphFile: 'order-sheet.xlsx',
    compareBefore: 'Before',
    compareAfter: 'After',
    compareAria: 'Comparison of a paper order form and a web quote form', // EN-REVIEW
    inboxLabel: 'This is the summary the company would receive', // EN-REVIEW
  },
  rail: [
    { id: 'hero', label: 'Offer' }, // EN-REVIEW
    { id: 'problema', label: 'Problem' }, // EN-REVIEW
    { id: 'megoldas', label: 'Solution' }, // EN-REVIEW
    { id: 'ajanlatkero-minta', label: 'Sample' }, // EN-REVIEW
    { id: 'folyamat', label: 'Process' }, // EN-REVIEW
    { id: 'munkaim', label: 'Work' }, // EN-REVIEW
    { id: 'szolgaltatasok', label: 'Prices' }, // EN-REVIEW
    { id: 'rolam', label: 'About' }, // EN-REVIEW
    { id: 'kapcsolat', label: 'Contact' }, // EN-REVIEW
  ],
  problem: {
    title: 'This is how a quote request arrives today', // EN-REVIEW
    cards: [
      { text: 'The customer prints it and fills it in by hand.' }, // EN-REVIEW
      { text: 'If something is missing, you call them back.' }, // EN-REVIEW
      { text: 'You take down the details one by one.' }, // EN-REVIEW
      { text: 'It always needs a conversation.' }, // EN-REVIEW
    ],
  },
  solution: {
    title: 'Your customer fills it in. You receive it in one piece.', // EN-REVIEW
    text: 'The customer fills in the form on your site, and the important fields cannot stay empty. You receive a single, tidy email, and you write the reply yourself, as you do now. You do not have to learn a new system.', // EN-REVIEW
  },
  tryIt: {
    title: 'Try it', // EN-REVIEW
    text: 'Fill in the sample and see what email a company would get from it.', // EN-REVIEW
  },
  process: {
    title: 'How I work', // EN-REVIEW
    lead: 'Four steps from the first talk to handover.', // EN-REVIEW
  },
  prices: {
    title: 'Prices', // EN-REVIEW
    lead: 'Package prices are known up front. For custom work I give a price after the assessment.', // EN-REVIEW
  },
  marquee: [
    'Web quote form',
    'Online order form',
    'Introduction site',
    'Custom web solution',
    'Hosting',
  ],
  about: {
    title: 'About',
    text: 'I am an electrical engineer and software developer. I work on industrial, energy and telecommunications systems, and I also build web solutions for small businesses.', // EN-REVIEW
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
    title: 'My work, layer by layer', // EN-REVIEW
    lead: 'Scroll and see how a sketch becomes a finished page.', // EN-REVIEW
    sampleBadge: 'Sample',
    explode: {
      structure: 'Structure',
      content: 'Content',
      finished: 'Finished page',
    },
    items: [
      {
        id: 'anettesvendi',
        title: 'Anett & Vendi',
        subtitle: 'Wedding invitation and RSVP site',
        site: { label: 'anettesvendi.hu', href: 'https://anettesvendi.hu' },
        paragraphs: [
          'A Hungarian and English site made for a couple’s guests. The guest signs in with the code on their invitation. They can RSVP, give the headcount, meal and accommodation needs, and request a song. Incoming replies collect on an organiser view, where the guest list, seating plan and budget can also be managed. The data can be downloaded as a spreadsheet, so meal needs can go to the caterer and song requests to the DJ.',
          'The same approach also works for a company’s quote or order form. Data from completed forms collect in one place and can be downloaded in summary.',
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
  services: {
    title: 'A web quote form instead of a downloadable Excel order sheet',
    sectionTitle: 'Prices', // EN-REVIEW
    lead: 'Package prices are known up front. For custom work I give a price after the assessment.', // EN-REVIEW
    problem:
      'Manual quoting takes a lot of time. The customer downloads the spreadsheet, fills it in and attaches it, and the company then retypes what arrived. With a web form every piece of data arrives together and complete.',
    problemHighlight: 'together and complete',
    craft:
      'I build every piece of work in code, not with a template or a page builder, so the solution follows how your company actually works.',
    emptyPrice: 'Fixed entry price: coming soon',
    priceSetSuffix: 'one-time',
    processTitle: 'How I work',
    processSteps: [
      {
        title: 'Assessment',
        description: 'We discuss what you need, and how orders reach you today.',
      },
      {
        title: 'Price before the work',
        description:
          'For a ready-made package the listed price applies. For a custom solution I give a price after the assessment.',
      },
      {
        title: 'Build',
        description: 'I write it in my own code, tailored to your business.',
      },
      {
        title: 'Handover',
        description: 'One revision round is included. I can take on hosting if you ask.',
      },
    ],
    featuredBadge: 'Main offer',
    includesTitle: 'Included',
    packages: [
      {
        id: 'quote-form',
        featured: true,
        title: 'Web quote form or order form',
        summary:
          'The customer submits the request directly on the site, so there is no downloading, filling in and sending back of spreadsheets.',
        includes: [
          'One form built onto your existing site',
          'Up to 10 fields plus file upload (Excel, PDF, DXF)',
          'A confirmation email to the customer',
          'You receive every request in one summary email',
          'One revision round',
        ],
        excludesTitle: 'Not included',
        excludes: ['Price calculation', 'A database', 'Linking to existing systems'],
        excludesNote: 'Those are custom work, priced after an assessment.',
        priceFromConfig: true,
        price: '',
      },
      {
        id: 'intro-site',
        featured: false,
        title: 'Introduction site',
        summary:
          'A short, clear site that presents the company and makes it easy for people to get in touch with you.',
        includes: [
          'Up to 6 content sections',
          'At least 6, at most 10 licensed photos',
          'Contact option',
          'Works well on a phone',
          'One revision round',
          'The domain is yours, and its fee is not included in the price',
        ],
        priceFromConfig: false,
        price: '59\u00A0000\u00A0Ft one-time',
        extra: 'Optional hosting and maintenance: HUF 4,900 per month',
      },
      {
        id: 'custom-app',
        featured: false,
        title: 'Custom solution',
        summary:
          'A price calculator, a database, or a link to the company’s existing systems, when a form is no longer enough.',
        includes: [
          'A short conversation about the task and its limits',
          'A written proposal of what the work includes',
        ],
        priceFromConfig: false,
        price: 'Price after a short assessment',
      },
    ],
    form: {
      title: 'Try it', // EN-REVIEW
      intro: 'Fill in the sample and see what email a company would get from it.', // EN-REVIEW
      demoBanner:
        'This is a sample; data sent from here does not reach me. You can request a quote in the Contact section.',
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
      fileChoose: 'Choose file',
      fileNone: 'No file chosen',
      previewFileNone: 'Not attached',
      previewQuantityUnit: ' pcs',
      previewTitle: 'This is the summary the company would receive',
      previewFrom: 'From',
      previewTo: 'To',
      previewRecipient: 'Minta Asztalos Bt.',
      previewSubjectLabel: 'Subject',
      previewSubject: 'Quote request from the website',
      sampleName: 'Minta Péter',
      sampleCompany: 'Minta Kft.',
      sampleEmail: 'minta@example.hu',
      samplePhone: '06 1 000 0000',
      sampleQuantity: '12',
      sampleNotes: '1200 × 800 mm',
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
      text: 'Write a short note about how your customers ask for a quote today. In my reply I will say which solution I recommend, and what it costs. You will find my other contact details in the Contact section.',
      button: 'Contact',
    },
  },
  contact: {
    title: 'Let’s talk about what you need.', // EN-REVIEW
    text: 'Write how quote requests reach you today, and I will suggest the simplest solution.', // EN-REVIEW
    orWrite: 'Or write here:', // EN-REVIEW
    finale: 'The quote request has arrived.', // EN-REVIEW
    email: 'bendzsiott1998@gmail.com',
    location: 'Budapest, Hungary',
    mailSubject: 'Assessment request',
    linkedIn: 'linkedin.com/in/benjaminottee',
  },
  footer: {
    text: '© 2026 Ott Benjámin, electrical engineer and software developer',
    sourceLabel: 'Source code of this website:',
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
    mainNav: 'Main navigation',
    mobileMenu: 'Mobile menu',
    closeMenu: 'Close menu',
    skipToContent: 'Skip to content',
    copyEmail: 'Copy email address',
    emailCopied: 'The address has been copied.',
  },
}
