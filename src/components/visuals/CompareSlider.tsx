import { useCallback, useId, useRef, useState } from 'react'
import { useI18n } from '@/context/I18nContext'

export function CompareSlider() {
  const { content } = useI18n()
  const [pos, setPos] = useState(50)
  const stageRef = useRef<HTMLDivElement>(null)
  const inputId = useId()
  const fields = content.services.form.fields
  const headers = [fields.name, fields.company, fields.email, fields.phone]

  const setFromClientX = useCallback((clientX: number) => {
    const rect = stageRef.current?.getBoundingClientRect()
    if (!rect?.width) return
    const next = ((clientX - rect.left) / rect.width) * 100
    setPos(Math.min(100, Math.max(0, next)))
  }, [])

  return (
    <div
      ref={stageRef}
      className="compare-stage crop-marks border border-line/25"
      onPointerDown={(event) => {
        if ((event.target as HTMLElement).tagName === 'INPUT') return
        setFromClientX(event.clientX)
      }}
    >
      <div className="compare-pane compare-before" aria-hidden="true">
        <p className="compare-file">{content.hero.morphFile}</p>
        <div className="compare-sheet">
          {headers.map((label) => (
            <span key={label}>{label}</span>
          ))}
          {headers.map((label) => (
            <span key={`${label}-r1`} className="compare-bar" />
          ))}
          {headers.map((label) => (
            <span key={`${label}-r2`} className="compare-bar" />
          ))}
        </div>
      </div>
      <div
        className="compare-pane compare-after"
        style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
        aria-hidden="true"
      >
        <div className="compare-form">
          {headers.map((label) => (
            <div key={label} className="compare-field">
              <span>{label}</span>
              <span className="compare-input" />
            </div>
          ))}
          <span className="compare-submit">{content.services.form.submit}</span>
        </div>
      </div>
      <span className="compare-tag compare-tag-before">{content.hero.compareBefore}</span>
      <span className="compare-tag compare-tag-after">{content.hero.compareAfter}</span>
      <div className="compare-divider" style={{ left: `${pos}%` }} aria-hidden="true" />
      <label className="sr-only" htmlFor={inputId}>
        {content.hero.compareAria}
      </label>
      <input
        id={inputId}
        className="compare-range"
        type="range"
        min={0}
        max={100}
        value={pos}
        aria-label={content.hero.compareAria}
        aria-valuetext={`${content.hero.compareBefore} ${Math.round(pos)}, ${content.hero.compareAfter} ${Math.round(100 - pos)}`}
        onChange={(event) => setPos(Number(event.target.value))}
      />
    </div>
  )
}
