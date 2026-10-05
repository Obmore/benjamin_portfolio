# Ott Benjámin - Portfolio

Premium minimal portfolio website for Ott Benjámin - Electrical Engineer & Software Developer.

## Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4

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
- Interactive Rollin station scene with unlock, return and charging states
- On-demand mobile screenshots for the website references
- Scroll-controlled spreadsheet-to-form illustration on the order page
- Reduced-motion support and keyboard controls for the interactive scenes
- SEO meta tags and JSON-LD
- Contact section with mailto and copy-to-clipboard

Visual sources and implementation notes: [interactive experience](docs/interactive-experience.md).
