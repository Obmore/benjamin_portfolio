import type { CSSProperties } from 'react'
import { useI18n } from '@/context/I18nContext'
import { SECTION_SHEETS } from '@/lib/constants'

const DRAWING_SUBJECT = {
  hu: 'Villamosmérnök és szoftverfejlesztő',
  en: 'Electrical engineer and software developer',
} as const

export function HeroVisual() {
  const { locale } = useI18n()
  const subject = DRAWING_SUBJECT[locale]

  const cells = [
    { label: 'NÉV', value: 'Ott Benjámin' },
    { label: 'TÁRGY', value: subject },
    { label: 'HELY', value: 'Budapest' },
    { label: 'LAP', value: SECTION_SHEETS.hero },
  ]

  return (
    <figure className="hero-figure" data-hero-figure aria-hidden="true">
      <div className="hero-figure-inner" data-hero-figure-inner>
        <svg className="hero-circuit" viewBox="0 0 240 240" focusable="false">
          <g
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="28" cy="48" r="7" vectorEffect="nonScalingStroke" />
            <circle cx="28" cy="48" r="2.5" fill="currentColor" stroke="none" />
            <path d="M35 48 H78" vectorEffect="nonScalingStroke" />
            <path
              d="M78 48 l10 -12 l14 24 l14 -24 l14 24 l14 -24 l10 12"
              vectorEffect="nonScalingStroke"
            />
            <path
              className="hero-signal"
              pathLength="1"
              d="M154 48 H196 V112 H88 V168"
              vectorEffect="nonScalingStroke"
            />
            <path
              d="M72 168 C60 168 60 192 72 192 C60 192 60 216 72 216"
              vectorEffect="nonScalingStroke"
            />
            <path
              d="M104 168 C116 168 116 192 104 192 C116 192 116 216 104 216"
              vectorEffect="nonScalingStroke"
            />
          </g>
        </svg>
        <dl className="hero-titleblock">
          {cells.map((cell, index) => (
            <div
              key={cell.label}
              className="hero-titleblock-cell"
              style={{ '--i': index } as CSSProperties}
            >
              <dt>{cell.label}</dt>
              <dd>{cell.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </figure>
  )
}
