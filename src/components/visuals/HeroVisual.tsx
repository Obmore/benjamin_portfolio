import type { CSSProperties } from 'react'
import { useEffect } from 'react'
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

  useEffect(() => {
    let stop = () => {}
    let cancelled = false
    const id = requestAnimationFrame(() => {
      void import('@/lib/hero3d-boot').then((mod) => {
        if (cancelled) return
        stop = mod.bootHero3d()
      })
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(id)
      stop()
    }
  }, [])

  return (
    <figure className="hero-figure hero-visual" data-hero-figure aria-hidden="true">
      <div className="hero-figure-inner" data-hero-figure-inner>
        <div className="hero-3d">
          <HeroK1Poster />
        </div>
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
