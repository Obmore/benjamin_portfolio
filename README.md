# Ott Benjámin - Portfolio

Premium minimal portfolio website for Ott Benjámin - Electrical Engineer & Software Developer.

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

Visual sources and implementation notes: [interactive experience](docs/interactive-experience.md).

## Verification

```bash
npm ci
npx playwright install chromium
npm run check
npm run test:e2e
```

Visual baselines are reviewed Windows/Chromium screenshots. See the
[renderer and verification notes](docs/interactive-experience.md#renderer-and-review-tools)
for baseline updates and browser limitations.

Pull requests run the same build, budget and browser checks on a Windows runner.
Failed browser tests retain screenshots and Playwright traces as CI artifacts.
The Rollin suite covers both resting poses and timed intermediate frames.

The privacy notice has one source: `adatkezeles/index.html`. Its reviewed article
is fingerprinted in `docs/privacy-content.sha256` and compared with the built page
by `npm run check:privacy`. Update that fingerprint only after reviewing a wording
change. The notice reflects local email drafting and GitHub Pages hosting; it
does not introduce server submission, tracking or automatic mailbox deletion.
