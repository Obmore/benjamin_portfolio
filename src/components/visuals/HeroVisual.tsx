import type { CSSProperties } from 'react'
import { useEffect } from 'react'
import { useI18n } from '@/context/I18nContext'
import { SECTION_SHEETS } from '@/lib/constants'
import { whenLcp } from '@/lib/lcp'
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
    let started = false
    let fallback = 0
    const start = () => {
      if (cancelled || started) return
      started = true
      if (fallback) window.clearTimeout(fallback)
      const boot = () => {
        if (cancelled) return
        void import('@/lib/hero3d-boot').then((mod) => {
          if (!cancelled) stop = mod.bootHero3d()
        })
      }
      const qa = new URLSearchParams(location.search).get('qa3d') === '1'
      if (qa) {
        boot()
        return
      }
      fallback = window.setTimeout(boot, 500)
    }
    void whenLcp().then(start)
    return () => {
      cancelled = true
      if (fallback) window.clearTimeout(fallback)
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
