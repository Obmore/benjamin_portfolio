import type { CSSProperties } from 'react'
import { useI18n } from '@/context/I18nContext'
import { SECTION_SHEETS } from '@/lib/constants'
import { HeroK1Poster } from './HeroK1Poster'

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
        <HeroK1Poster />
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
