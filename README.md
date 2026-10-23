# Ott Benjámin - Portfolio

Customer-facing website of Ott Benjámin, sole proprietor: web order forms, automation and measurement data processing for small and medium-sized businesses.

## Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- Zdog (lazy-loaded SVG scene)
- Playwright visual regression tests + Axe accessibility checks

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:5173/](http://localhost:5173/).

## Build

```bash
npm run build
npm run preview
```

## Deploy to GitHub Pages

```bash
npm run deploy
```

Site URL: `https://ottbenjamin.hu/`

## Project structure

```
src/
├── components/   UI, layout, sections, visuals
├── context/      i18n provider
├── data/         Hungarian and English content
├── hooks/
└── lib/          Constants, clipboard helper
```

## Fonts

The subsetted WOFF2 files in `public/fonts/` are committed. Rebuild them only after a
font package update; the build needs Python 3 with fonttools and Brotli:

```bash
python -m pip install -r scripts/requirements-fonts.txt
npm run build:fonts
```

The script runs `python3` (`python` on Windows, where `python3` is usually a Store stub).
Set `PYTHON` to use another interpreter, for example one from a virtual environment. If
Python or a module is missing, `build:fonts` stops with the command to run. Its preload
budget (60 KB) covers every font that `index.html` preloads.

## CV files

Place PDFs in `public/cv/`:

- `Ott_Benjamin_CV_HU.pdf`
- `Ott_Benjamin_CV_EN.pdf`

## Features

- Hungarian (default) and English language toggle
- Light theme
- Smooth anchor navigation
- Scroll animations
- Interactive Rollin station scene with solid geometry, unlock, return and charging states
- On-demand mobile screenshots for the website references
- Content-sized service cards and a sticky spreadsheet-to-form illustration on the order page
- Reduced-motion support and keyboard controls for the interactive scenes
- SEO meta tags and JSON-LD
- Contact section with mailto and copy-to-clipboard
- Static Hungarian privacy notice at `/adatkezeles/`, linked from both footers
- Packages and prices on the home page (`#csomagok`) and on `/megrendeles/`, from one price source
- Imprint at `/impresszum/` (Hungarian) and `/en/imprint/` (English), draft terms at `/aszf/`
- `sitemap.xml` with the indexable pages, referenced from `robots.txt`

Visual sources and implementation notes: [interactive experience](docs/interactive-experience.md).

## Verification

```bash
npm ci
npx playwright install chromium
npm run check
npm run test:e2e
```

`npm run test:e2e` builds the site first (the Playwright web server runs
`npm run build` before `vite preview`), so it also works on a clean checkout.
`npm run check` includes the Node unit tests of the build scripts (`npm run test:scripts`).

Visual baselines are reviewed Windows/Chromium screenshots. See the
[renderer and verification notes](docs/interactive-experience.md#renderer-and-review-tools)
for baseline updates and browser limitations.

Pull requests run the same build, budget and browser checks on a Windows runner.
Failed browser tests retain screenshots and Playwright traces as CI artifacts.
The Rollin suite covers both resting poses and timed intermediate frames.

Package prices have one source: `src/data/pricing.ts`. The home page imports it,
and the build writes the same amounts into `megrendeles/index.html` through
`{{huf:…}}` and `{{vat}}` placeholders (see `vite.config.ts`). Never type an amount
into the HTML; `npm run check:megrendeles` and `e2e/customer-site.spec.ts` fail if
the two pages drift apart. `npm run check:site` checks the sitemap against the
built pages, the single contact address and the colour palette.

The privacy notice has one source: `adatkezeles/index.html`. Its reviewed article
is fingerprinted in `docs/privacy-content.sha256` and compared with the built page
by `npm run check:privacy`. Update that fingerprint only after reviewing a wording
change. The notice reflects local email drafting and GitHub Pages hosting; it
does not introduce server submission, tracking or automatic mailbox deletion.
