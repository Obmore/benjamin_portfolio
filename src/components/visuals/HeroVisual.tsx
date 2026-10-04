import type { CSSProperties } from 'react'
import { useEffect } from 'react'
import { useI18n } from '@/context/I18nContext'
import { SECTION_SHEETS } from '@/lib/constants'
import { HeroK1Poster } from './HeroK1Poster'

const DRAWING_SUBJECT = {
  hu: 'Villamosmérnök és szoftverfejlesztő',
  en: 'Electrical engineer and software developer',
} as const

const HERO_POSTER_PATH = document.documentElement.classList.contains('is-hero-poster')

const POSTER_W = 350
const POSTER_H = 263

export function HeroVisual() {
  const { locale } = useI18n()
  const subject = DRAWING_SUBJECT[locale]

  const cells = [
    { label: 'NÉV', value: 'Ott Benjámin' },
    { label: 'TÁRGY', value: subject },
    { label: 'HELY', value: 'Budapest' },
    { label: 'LAP', value: SECTION_SHEETS.hero },
  ]

  useEffect(() => {
    if (HERO_POSTER_PATH) return
    let stop = () => {}
    let cancelled = false
    void import('@/lib/hero3d-boot').then((mod) => {
      if (!cancelled) stop = mod.bootHero3d()
    })
    return () => {
      cancelled = true
      stop()
    }
  }, [])

  return (
    <figure className="hero-figure" data-hero-figure aria-hidden="true">
      <div className="hero-figure-inner" data-hero-figure-inner>
        {HERO_POSTER_PATH ? (
          <HeroK1Poster />
        ) : (
          <div className="hero-3d" data-hero3d="poster">
            <img
              className="hero-3d-poster"
              src="/hero/k1-p0@1x.webp"
              srcSet="/hero/k1-p0@1x.webp 1x, /hero/k1-p0@2x.webp 2x"
              width={POSTER_W}
              height={POSTER_H}
              alt=""
              fetchPriority="high"
              decoding="async"
              draggable={false}
              aria-hidden="true"
            />
          </div>
        )}
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
