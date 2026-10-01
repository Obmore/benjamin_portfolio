import type { CSSProperties } from 'react'
import { useEffect } from 'react'
import { useI18n } from '@/context/I18nContext'
import { C_OBJECTS } from '@/lib/c-objects'
import { canLoad3dEngine } from '@/lib/three-gate'
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

  useEffect(() => {
    if (!canLoad3dEngine()) return
    let stop = () => {}
    void import('@/three/boot').then((mod) => {
      mod.boot3d()
      stop = mod.stop3d
    })
    return () => stop()
  }, [])

  return (
    <figure className="hero-figure" data-hero-figure aria-hidden="true">
      <div className="hero-figure-inner" data-hero-figure-inner>
        <div className="hero-c-grid">
          {C_OBJECTS.map((item) => (
            <div key={item.id} className="scene3d-box" data-scene3d={item.id}>
              <img
                className="scene3d-poster"
                src={`${import.meta.env.BASE_URL}${item.poster}`}
                width={96}
                height={96}
                alt=""
                decoding="async"
                fetchPriority="low"
              />
            </div>
          ))}
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
