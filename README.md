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
└── lib/          Constants, contact form stub, quote-form submit
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
- Services section with three packages and a sample quote-request form

## Quote form sending (demo vs live)

The sample quote form (`Ajánlatkérő minta`) posts through one configurable endpoint.

- `VITE_QUOTE_FORM_ENDPOINT` — POST target (Web3Forms, Formspree, or any similar FormData endpoint)
- `VITE_QUOTE_FORM_ACCESS_KEY` — optional. Needed for Web3Forms (`access_key`). Leave empty for Formspree.

Copy `.env.example` to `.env` (gitignored). Do not commit keys or hardcode them in source.

### Demo mode (default)

If `VITE_QUOTE_FORM_ENDPOINT` is empty, the form stays in **demo mode**. It still validates, accepts a sample Excel/PDF/DXF file, and shows the success screen. A banner states that this is a sample and nothing was sent. There is no network request.

### Enable real sending

1. Create a form on [Web3Forms](https://web3forms.com/) or [Formspree](https://formspree.io/).
2. Set the env vars locally:

```bash
VITE_QUOTE_FORM_ENDPOINT=https://api.web3forms.com/submit
VITE_QUOTE_FORM_ACCESS_KEY=your_access_key
```

Formspree example (no access key):

```bash
VITE_QUOTE_FORM_ENDPOINT=https://formspree.io/f/your_form_id
VITE_QUOTE_FORM_ACCESS_KEY=
```

3. Rebuild. The sample form POSTs `FormData` (including the optional attachment) to that URL.

Vite only exposes variables prefixed with `VITE_`. After changing env vars, restart `npm run dev`.

For GitHub Pages, add the same names as Actions secrets and pass them into the existing **Build** step. This repo does not change the Pages workflow.

### File uploads on free tiers

Checked against vendor docs:

- **Web3Forms:** file attachments are a [Pro feature](https://docs.web3forms.com/getting-started/pro-features/file-attachments). The free plan does not include uploads. On Pro, the default HTML5 uploader is a single file up to 5 MB.
- **Formspree:** file uploads are documented for [Personal, Professional and Business plans](https://help.formspree.io/articles/building-your-form/file-uploads), not the free plan.

In demo mode, files are validated in the browser only. With a live endpoint on a free plan, text fields can still arrive by email. Attachments may be dropped or rejected by the provider.

### Quote-form package price

The main package has no published entry price yet. Edit the single constant `QUOTE_FORM_PACKAGE_PRICE` in `src/lib/constants.ts`. While it is an empty string, the site shows **Fix belépő ár – hamarosan** (and the English equivalent). Do not put a made-up number there.
