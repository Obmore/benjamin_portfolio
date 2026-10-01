import type { SiteContent } from './types'

export const contentHu: SiteContent = {
  meta: {
    title: 'Ott Benjámin, villamosmérnök és szoftverfejlesztő',
    description:
      'Ott Benjámin, villamosmérnök és szoftverfejlesztő. Python, full-stack fejlesztés, ipari rendszerek, energetika és telekommunikációs K+F.',
  },
  nav: {
    about: 'Rólam',
    experience: 'Tapasztalat',
    skills: 'Kompetenciák',
    projects: 'Projektek',
    cv: 'Önéletrajz',
    contact: 'Kapcsolat',
  },
  hero: {
    headline: 'villamosmérnök és szoftverfejlesztő',
    subheadline:
      'Python, full-stack fejlesztés, ipari kommunikáció, energetikai rendszerek, telekommunikációs K+F és műszaki projektmenedzsment egy kézben.',
    ctaContact: 'Kapcsolatfelvétel',
    ctaCv: 'Önéletrajz letöltése',
    ctaLinkedIn: 'LinkedIn profil',
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
    title: 'Rólam',
    text: 'Villamosmérnöki háttérrel rendelkező szoftverfejlesztő és műszaki projektmérnök vagyok. Olyan feladatok érdekelnek, ahol a mérnöki gondolkodás, a szoftverfejlesztés és a rendszerszintű problémamegoldás találkozik.\n\nDolgoztam webes és backend fejlesztéseken, Python-alapú mérnöki feladatokon, telekommunikációs K+F környezetben, valamint ipari és energetikai projektek műszaki koordinációján. Erősségem, hogy képes vagyok hidat képezni a fejlesztői, mérnöki és üzleti szereplők között.',
    highlights: [
      {
        title: 'Mérnöki rendszerszemlélet',
        description:
          'Strukturált elemzés, rendszerszintű gondolkodás és műszaki problémák átfogó megközelítése.',
      },
      {
        title: 'Szoftverfejlesztési háttér',
        description:
          'Full-stack tapasztalat modern webes és backend technológiákkal, valamint Python-alapú mérnöki fejlesztésekkel.',
      },
      {
        title: 'Projekt- és partnerkoordináció',
        description:
          'Fejlesztői, mérnöki és üzleti szereplők közötti egyeztetés, dokumentáció és tesztelési folyamatok támogatása.',
      },
    ],
  },
  experience: {
    title: 'Szakmai tapasztalat',
    items: [
      {
        title: 'Elektronikai fejlesztőmérnök',
        company: 'HM Elektronikai, Logisztikai és Vagyonkezelő Zrt.',
        period: '2026 óta',
        bullets: [
          'Elektronikai fejlesztési és rendszerszintű mérnöki feladatok támogatása.',
          'Villamosmérnöki szemlélet alkalmazása fejlesztési környezetben.',
          'Műszaki problémák strukturált elemzése és megoldása.',
        ],
      },
      {
        title: 'Villamosmérnök és projektmenedzser',
        company: 'Voltrack',
        period: '2025 óta',
        bullets: [
          'Energetikai és ipari rendszerekhez kapcsolódó műszaki projektek koordinációja.',
          'Ipari kommunikációs, adatgyűjtési és távfelügyeleti feladatok támogatása.',
          'Partnerekkel, fejlesztőkkel és műszaki szereplőkkel való egyeztetés.',
          'Rendszerszintű hibakeresés, dokumentáció és tesztelési folyamatok támogatása.',
        ],
      },
      {
        title: 'Szoftverfejlesztő',
        company: 'Rollin',
        period: '2023 és 2025 között',
        bullets: [
          'Webalkalmazások frontend és backend fejlesztése.',
          'React, Vite, Tailwind CSS és Ant Design használata frontend oldalon.',
          'Backend- és API-fejlesztési feladatok C#, Microsoft SQL és Quartz környezetben.',
          'Azure DevOps, Git és CI/CD szemléletű fejlesztési folyamatok használata.',
        ],
      },
      {
        title: 'Kutató',
        company: 'Ericsson',
        period: '2023 és 2025 között',
        bullets: [
          'Kvantumkommunikációhoz és QKD-rendszerekhez kapcsolódó K+F feladatok.',
          'Szoftverfejlesztés több programozási nyelven, valamint mérési és kísérleti munkák támogatása.',
          'Szoftveres és hardveres problémák elemzése telekommunikációs kutatási környezetben.',
          'Git-alapú verziókezelés és mérnöki dokumentáció.',
        ],
      },
      {
        title: 'Önálló fejlesztő, egyéni vállalkozó',
        company: '',
        period: '2024 óta',
        bullets: [
          'Webes és technikai megoldások fejlesztése üzleti igények alapján.',
          'Frontend, backend és automatizációs jellegű feladatok.',
          'Modern fejlesztői eszközök és AI-támogatott munkafolyamatok alkalmazása.',
        ],
      },
    ],
  },
  skills: {
    title: 'Technológiák és kompetenciák',
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
    title: 'Kiemelt szakmai irányok',
    items: [
      {
        title: 'Ipari rendszerek és távfelügyelet',
        description:
          'Ipari és energetikai rendszerek kommunikációs, adatgyűjtési és integrációs feladatainak támogatása.',
      },
      {
        title: 'Python-alapú mérnöki fejlesztések',
        description:
          'Mérési, adatfeldolgozási és kísérleti feladatokat támogató Python-alapú megoldások.',
      },
      {
        title: 'Full-stack webfejlesztés',
        description:
          'Frontend és backend fejlesztési tapasztalat modern webes technológiákkal.',
      },
      {
        title: 'Telekommunikációs K+F',
        description:
          'Kvantumkommunikációs és QKD rendszerekhez kapcsolódó kutatás-fejlesztési mérnöki tapasztalat.',
      },
    ],
  },
  cv: {
    title: 'Önéletrajz',
    text: 'Töltse le a szakmai önéletrajzomat, vagy keressen meg LinkedInen.',
    downloadHu: 'Magyar CV letöltése',
    downloadEn: 'Angol CV letöltése',
    linkedIn: 'LinkedIn',
  },
  contact: {
    title: 'Kapcsolat',
    text: 'Nyitott vagyok szoftverfejlesztői, műszaki projektmérnöki, ipari/energetikai rendszerekkel és K+F-fel kapcsolatos lehetőségekre.',
    email: 'bendzsiott1998@gmail.com',
    location: 'Budapest, Hungary',
    linkedIn: 'linkedin.com/in/benjaminottee',
    prompt: 'Írjon nekem e-mailt, és hamarosan válaszolok.',
    copyAddress: 'Cím másolása',
    copied: 'Kimásolva',
  },
  footer: {
    text: '© 2026 Ott Benjámin, villamosmérnök és szoftverfejlesztő',
  },
  common: {
    emailLabel: 'E-mail',
    locationLabel: 'Helyszín',
    linkedInLabel: 'LinkedIn',
    menuToggle: 'Menü megnyitása',
    themeToDark: 'Sötét mód',
    themeToLight: 'Világos mód',
    langToEn: 'Váltás angolra',
    langToHu: 'Váltás magyarra',
  },
}
