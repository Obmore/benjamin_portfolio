# Ott Benjámin — Portfolio

Premium minimal portfolio website for Ott Benjámin — Electrical Engineer & Software Developer.

## Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- Framer Motion
- react-helmet-async (SEO)

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:5173/benjamin_portfolio/](http://localhost:5173/benjamin_portfolio/) (base path matches GitHub Pages).

## Build

```bash
npm run build
npm run preview
```

## Deploy to GitHub Pages

```bash
npm run deploy
```

Site URL: `https://obmore.github.io/benjamin_portfolio/`

## Project structure

```
src/
├── components/   UI, layout, sections, visuals
├── context/      Theme + i18n providers
├── data/         Hungarian and English content
├── hooks/
└── lib/          Constants, contact form stub
```

## CV files

Place PDFs in `public/cv/`:

- `Ott_Benjamin_CV_HU.pdf`
- `Ott_Benjamin_CV_EN.pdf`

## Features

- Hungarian (default) and English language toggle
- Light / dark mode
- Smooth anchor navigation
- Scroll animations
- SEO meta tags and JSON-LD
- Contact form (frontend-only, ready for EmailJS / Resend / API)
