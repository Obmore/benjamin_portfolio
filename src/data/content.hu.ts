import type { SiteContent } from './types'

export const contentHu: SiteContent = {
  meta: {
    title: 'Ott Benjámin, villamosmérnök és szoftverfejlesztő',
    description:
      'Ott Benjámin, villamosmérnök és szoftverfejlesztő. Python, webfejlesztés, ipari rendszerek, energetika és távközlési kutatás-fejlesztés.',
  },
  nav: {
    about: 'Rólam',
    experience: 'Tapasztalat',
    skills: 'Kompetenciák',
    projects: 'Munkáim',
    cv: 'Önéletrajz',
    contact: 'Kapcsolat',
  },
  hero: {
    headline:
      'Villamosmérnökként és szoftverfejlesztőként mérnöki rendszerekhez készítek szoftveres megoldásokat.',
    subheadline:
      'Webalkalmazások fejlesztése, Python-alapú automatizálás, ipari kommunikáció, energetikai rendszerek, távközlési kutatás-fejlesztés és műszaki projektvezetés.',
    ctaContact: 'Kapcsolatfelvétel',
    ctaCv: 'Önéletrajz letöltése',
    ctaLinkedIn: 'LinkedIn-profil',
    chips: [
      'Python',
      'React',
      'C#',
      'Azure DevOps',
      'Docker',
      'Linux',
      'TCP/IP',
      'Ipari rendszerek',
      'Energetika',
      'Távközlés',
      'Kutatás és fejlesztés',
    ],
  },
  about: {
    title: 'Rólam',
    text: 'Villamosmérnök, szoftverfejlesztő és műszaki projektmérnök vagyok. Olyan feladatokon szeretek dolgozni, amelyekhez mérnöki gondolkodásra, programozásra és a teljes rendszer átlátására is szükség van.\n\nFejlesztettem webes felületeket, szerveroldali rendszereket és Python-alapú mérnöki eszközöket. Dolgoztam távközlési kutatás-fejlesztésben, valamint ipari és energetikai projektek műszaki koordinációján is. A fejlesztők, mérnökök és üzleti partnerek közötti együttműködést is segítem.',
    highlights: [
      {
        title: 'Mérnöki rendszerszemlélet',
        description:
          'A műszaki problémákat az összefüggéseikkel együtt vizsgálom, a teljes rendszer működését szem előtt tartva.',
      },
      {
        title: 'Szoftverfejlesztési háttér',
        description:
          'Webes felületeket, szerveroldali rendszereket és Python-alapú mérnöki eszközöket fejlesztek.',
      },
      {
        title: 'Projekt- és partnerkoordináció',
        description:
          'Összehangolom a fejlesztők, mérnökök és üzleti partnerek munkáját, és segítem a dokumentálást és a tesztelést.',
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
          'Egyeztetés a partnerekkel, fejlesztőkkel és műszaki szakemberekkel.',
          'Rendszerszintű hibakeresés, dokumentáció és tesztelési folyamatok támogatása.',
        ],
      },
      {
        title: 'Szoftverfejlesztő',
        company: 'Rollin',
        period: '2023 és 2025 között',
        bullets: [
          'Webalkalmazások felületének és szerveroldali működésének fejlesztése.',
          'Felületfejlesztés React, Vite, Tailwind CSS és Ant Design használatával.',
          'Backend- és API-fejlesztési feladatok C#, Microsoft SQL és Quartz környezetben.',
          'Verziókezelés, automatikus tesztelés és telepítés Git és Azure DevOps használatával.',
        ],
      },
      {
        title: 'Kutató',
        company: 'Ericsson',
        period: '2023 és 2025 között',
        bullets: [
          'Kvantumkommunikációhoz és QKD-rendszerekhez kapcsolódó K+F feladatok.',
          'Szoftverfejlesztés több programozási nyelven, valamint mérési és kísérleti munkák támogatása.',
          'Szoftveres és hardveres problémák elemzése távközlési kutatások során.',
          'Git-alapú verziókezelés és mérnöki dokumentáció.',
        ],
      },
      {
        title: 'Önálló fejlesztő, egyéni vállalkozó',
        company: '',
        period: '2024 óta',
        bullets: [
          'Webes és műszaki megoldások fejlesztése üzleti igények alapján.',
          'Felületfejlesztés, szerveroldali fejlesztés és ismétlődő feladatok automatizálása.',
          'Modern fejlesztőeszközök és mesterséges intelligenciával támogatott munkafolyamatok használata.',
        ],
      },
    ],
  },
  skills: {
    title: 'Technológiák és kompetenciák',
    groups: [
      {
        title: 'Szoftverfejlesztés',
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
        title: 'Mérnöki munka és rendszerek',
        skills: [
          'Villamosmérnöki munka',
          'Ipari rendszerek',
          'Energetikai rendszerek',
          'Távközlés',
          'TCP/IP',
          'Modbus',
          'VPN',
          'Rendszerintegráció',
        ],
      },
      {
        title: 'Fejlesztőeszközök és DevOps',
        skills: [
          'Azure DevOps',
          'Git',
          'Docker',
          'Linux',
          'Automatikus tesztelés és telepítés',
        ],
      },
      {
        title: 'Projektvezetés és kommunikáció',
        skills: [
          'Műszaki projektvezetés',
          'Dokumentáció',
          'Kapcsolattartás a partnerekkel',
          'Tesztelés',
          'Hibakeresés és hibaelhárítás',
          'Igényfelmérés',
        ],
      },
    ],
  },
  projects: {
    title: 'Munkáim',
    indexLabel: 'Munkáim áttekintése',
    sampleBadge: 'Minta',
    items: [
      {
        id: 'anettesvendi',
        title: 'Anett & Vendi',
        subtitle: 'Esküvői meghívó és visszajelző oldal',
        site: { label: 'anettesvendi.hu', href: 'https://anettesvendi.hu' },
        paragraphs: [
          'Egy pár vendégeinek készült, magyar és angol nyelvű weboldal. A vendég a meghívóján lévő kóddal lép be. Visszajelezhet a részvételről, megadhatja a létszámot, az étkezési és a szállásigényét, és zenét is kérhet. A beérkező válaszok egy szervezői felületen gyűlnek, ahol a vendéglista, az ültetési rend és a költségvetés is kezelhető. Az adatok táblázatként letölthetők, így például az étkezési igények mehetnek a vendéglátónak, a zenekérések pedig a DJ-nek.',
        ],
        tech: 'Technológia: Vite, TypeScript, saját API, Cloudflare. Tervezés és fejlesztés: Ott Benjámin.',
        image: 'work/anettesvendi.webp',
        imageWidth: 1280,
        imageHeight: 800,
        alt: 'Anett & Vendi esküvői oldal: tengerparti kezdőképernyő meghívókódos belépéssel',
      },
      {
        id: 'lelkiter',
        title: 'Életrendező',
        subtitle: 'Bemutatkozó oldal',
        site: { label: 'lelkiter.hu', href: 'https://lelkiter.hu' },
        paragraphs: [
          'Bemutatkozó oldal egy budapesti segítő szakembernek, aki családállítással, rajzvizsgálattal, álomfejtéssel, masszázzsal és homeopátiával foglalkozik. Magyarul és angolul olvasható, és külön oldalokon mutatja be a szakembert, a szolgáltatásokat és a blogbejegyzéseket. Mobilon is jól kezelhető, a látogató pedig e-mailben vagy telefonon közvetlenül felveheti a kapcsolatot.',
        ],
        tech: 'Technológia: React, Vite, Cloudflare. Tervezés és fejlesztés: Ott Benjámin.',
        image: 'work/lelkiter.webp',
        imageWidth: 1280,
        imageHeight: 800,
        alt: 'Életrendező bemutatkozó oldal kezdőképernyője kapcsolatfelvétel gombokkal',
      },
      {
        id: 'hotel-rental',
        title: 'Szállodai járműbérlő rendszer',
        subtitle: 'Elektromos rollerek és kerékpárok automatizált bérlése szállodáknak',
        tag: 'Csapatmunka',
        paragraphs: [
          'A szállodai bérlés webes felületén, a szerveroldali rendszeren, az elektromos kerékpárok távoli vezérlésén és a töltőállomások szoftverén dolgoztam.',
        ],
        tech: 'Technológia: React, TypeScript, .NET, Azure, Raspberry Pi, Python.',
      },
      {
        id: 'lelek-es-nyelv',
        title: 'Lélek & Nyelv',
        subtitle: 'Bemutatkozó mintaoldal',
        sample: true,
        site: {
          label: 'obmore.github.io/lelek-es-nyelv-portfolio',
          href: 'https://obmore.github.io/lelek-es-nyelv-portfolio',
        },
        paragraphs: [
          'Mintaoldal egy mentálhigiénés segítő és angoltanár számára, a szolgáltatásokkal, a közös munka menetével és a gyakori kérdésekkel. Bemutató céllal készült, nem ügyfélmunka.',
        ],
        tech: 'Technológia: Next.js, React, Tailwind CSS.',
        image: 'work/lelek-es-nyelv.webp',
        imageWidth: 1280,
        imageHeight: 800,
        alt: 'Lélek & Nyelv mintaoldal kezdőképernyője: Biztos tér, bátrabb hang',
      },
    ],
  },
  cv: {
    title: 'Önéletrajz',
    text: 'Töltse le a szakmai önéletrajzomat, vagy keressen meg a LinkedInen.',
    downloadHu: 'Magyar önéletrajz',
    downloadEn: 'Angol önéletrajz',
    linkedIn: 'LinkedIn',
  },
  contact: {
    title: 'Kapcsolat',
    text: 'Szívesen dolgozom szoftverfejlesztési és műszaki projekteken, ipari és energetikai rendszereken, valamint kutatás-fejlesztési feladatokon.',
    email: 'bendzsiott1998@gmail.com',
    location: 'Budapest',
    linkedIn: 'linkedin.com/in/benjaminottee',
    prompt: 'Írjon nekem e-mailt, és hamarosan válaszolok.',
    copyAddress: 'Cím másolása',
    copied: 'Kimásolva',
    copiedAnnouncement: 'E-mail-cím a vágólapra másolva',
  },
  footer: {
    text: '© 2026 Ott Benjámin, villamosmérnök és szoftverfejlesztő',
  },
  common: {
    emailLabel: 'E-mail',
    locationLabel: 'Helyszín',
    linkedInLabel: 'LinkedIn',
    menuToggle: 'Menü megnyitása',
    langToEn: ', váltás angolra',
    langToHu: ', váltás magyarra',
    orderLink: 'Megrendelés',
    navMain: 'Fő navigáció',
    navMobile: 'Mobil navigáció',
    skipToContent: 'Ugrás a tartalomra',
    backToTop: 'OB. - Ott Benjámin, ugrás az oldal tetejére',
  },
}
