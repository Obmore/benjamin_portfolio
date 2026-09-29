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
└── lib/          Constants, quote-form submit
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
- Contact section with a mailto link (no contact form)
- Services section with three packages and a sample quote-request form
- Munkáim / My work section with live and sample sites

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

### File uploads from a static site (factual comparison)

How a static GitHub Pages site can receive a quote form with a file, according to official pricing/docs pages. Prices in USD as stated there. Anything not on those pages is marked unverified.

#### (a) Hosted form services

| Service | Free tier: file upload? | Cheapest plan that includes file upload | Sources |
| --- | --- | --- | --- |
| [Web3Forms](https://web3forms.com/pricing) | No. File upload / attachments is listed on Pro, not Free. Docs call attachments a Pro feature. The $49/year Starter plan is described on the pricing page as having limited paid features and **no file uploads**. | **Pro — $12/mo** ($149 billed yearly). Default HTML5 uploader: one file, up to 5 MB (docs). | [Pricing](https://web3forms.com/pricing), [File attachments](https://docs.web3forms.com/getting-started/pro-features/file-attachments) |
| [Formspree](https://formspree.io/plans) | No. Plans table: File Uploads **0 GB** on Free. Help: uploads on Personal, Professional, Business. | **Personal** — $15/month, or $120/year ($10/month billed annually). Plans table: **1 GB** file uploads. Help: up to 10 files / 25 MB each, 100 MB total request (the same help page also mentions “up to 5 files” in one comparison blurb). | [Plans](https://formspree.io/plans), [File uploads](https://help.formspree.io/articles/building-your-form/file-uploads) |
| [Basin](https://usebasin.com/pricing) | Yes, according to the plan comparison table: **File Uploads 100MB** on Free ($0). Free copy: 1 form endpoint, 50 submissions/mo, 30-day retention. | Free includes 100MB. Next paid step with more storage: **Starter $12.50/mo** billed yearly, 500MB file storage. | [Pricing](https://usebasin.com/pricing) |
| Getform / [Forminit](https://getform.io/pricing) | Yes on Free, per the pricing page: **100 MB File Storage**, 100 submissions/mo, $0. The same page states Getform was renamed Forminit in January 2026. | Free includes 100 MB. Next listed paid plan: **Pro $15.83 per month** billed yearly, 1 GB file storage. | [Pricing](https://getform.io/pricing) |

This sample form POSTs `FormData` to whatever URL is in `VITE_QUOTE_FORM_ENDPOINT`. Demo mode (empty endpoint) validates the file in the browser and does not send it.

#### (b) Self-hosted serverless receiver (Cloudflare Workers / Pages Functions + email API such as Resend)

Not wired in this repo. Official limits that matter at low volume:

- **Cloudflare Workers Free** ([pricing](https://developers.cloudflare.com/workers/platform/pricing/), [limits](https://developers.cloudflare.com/workers/platform/limits/)): 100,000 requests/day; 10 ms CPU time per invocation; 128 MB memory; 50 subrequests/request. Pages Functions are billed as Workers. Incoming request body size follows the **Cloudflare account** plan, not the Workers plan: **100 MB** on Cloudflare Free and Pro.
- **Resend Free** ([pricing](https://resend.com/pricing)): 3,000 emails/month, **100 emails per day**, 3 domains, 30-day data retention. Ticket support.

Unverified here: Resend’s free-plan attachment size/count, and whether a 10 ms Worker CPU budget is enough to parse a multipart upload and call Resend. Cloudflare documents 10 ms CPU on Free. That is short for large files. Measure before relying on it.

### Quote-form package price

The main package price lives in one constant, `QUOTE_FORM_PACKAGE_PRICE` in `src/lib/constants.ts` (currently `149 000 Ft`, with a non-breaking space as thousands separator and before `Ft`). The UI shows **149 000 Ft egyszeri**. If the constant is emptied, the UI falls back to **Fix belépő ár: hamarosan**. The quote-form package has no monthly fee. The introduction site can add **Kérhető üzemeltetés: havi 4 900 Ft**.
