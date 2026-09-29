import { useEffect, useRef, useState } from 'react'
import { useI18n } from '@/context/I18nContext'
import { useInViewOnce } from '@/hooks/useInViewOnce'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { MOTION } from '@/lib/motion'
import { CompareSlider } from '@/components/visuals/CompareSlider'
import { isCompactField, MORPH_COLS, MORPH_ROWS } from './morphLayout'
import './quoteFormMorph.css'

export function QuoteFormMorph() {
  const { content } = useI18n()
  const reduced = usePrefersReducedMotion()
  const stageRef = useRef<HTMLDivElement>(null)
  const inView = useInViewOnce(stageRef, { threshold: 0.5 })
  const [loaded, setLoaded] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const mark = () => setLoaded(true)
    if (document.readyState === 'complete') mark()
    else window.addEventListener('load', mark)
    return () => window.removeEventListener('load', mark)
  }, [])

  useEffect(() => {
    if (reduced || !loaded || !inView || playing) return
    if (document.visibilityState !== 'visible') return

    let cancelled = false
    const start = () => {
      if (!cancelled) setPlaying(true)
    }
    const timeoutId = window.setTimeout(start, MOTION.durationMs.medium)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [reduced, loaded, inView, playing])

  useEffect(() => {
    if (!playing) return
    const timer = window.setTimeout(() => setDone(true), MOTION.heroTransformMs)
    return () => window.clearTimeout(timer)
  }, [playing])

  const fields = content.services.form.fields
  const labels = [
    { key: 'name', text: fields.name },
    { key: 'company', text: fields.company },
    { key: 'email', text: fields.email },
    { key: 'phone', text: fields.phone },
    { key: 'material', text: fields.material },
    { key: 'quantity', text: fields.quantity },
  ]
  const envelope = content.services.packages[0]?.includes[3] ?? ''

  if (reduced) {
    return <CompareSlider />
  }

  return (
    <div
      ref={stageRef}
      role="img"
      aria-label={content.hero.morphAria}
      className={`morph-stage crop-marks border border-line/25 ${
        playing ? 'is-playing' : ''
      } ${done ? 'is-done' : ''}`}
    >
      <AnimatedMorph
        labels={labels}
        filename={content.hero.morphFile}
        fileHint={content.services.form.fileHint}
        submit={content.services.form.submit}
        envelope={envelope}
      />
    </div>
  )
}

function AnimatedMorph({
  labels,
  filename,
  fileHint,
  submit,
  envelope,
}: {
  labels: { key: string; text: string }[]
  filename: string
  fileHint: string
  submit: string
  envelope: string
}) {
  return (
    <div className="morph-frame" aria-hidden="true">
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 400 300"
        preserveAspectRatio="none"
      >
        <rect className="morph-border" x="2" y="2" width="396" height="296" />
      </svg>
      <span className="morph-tab">{filename}</span>
      <div className="morph-scan" />

      <div className="morph-sheet">
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 400 300">
          <path className="morph-grid-line" d="M8 70 H392 M8 130 H392 M8 190 H392" />
          <path className="morph-grid-line" d="M80 8 V292 M160 8 V292 M240 8 V292 M320 8 V292" />
        </svg>
        <div className="morph-sheet-grid">
          <div className="morph-cell axis" />
          {MORPH_COLS.map((col, index) => (
            <div
              key={col}
              className={`morph-cell axis ${index >= 4 ? 'morph-optional' : ''}`}
            >
              {col}
            </div>
          ))}
          {MORPH_ROWS.map((row) => (
            <SheetRow key={row} row={row} labels={labels} />
          ))}
        </div>
      </div>

      <div className="morph-form">
        <div className="morph-form-grid">
          {labels.map((label) => (
            <div
              key={label.key}
              className={`morph-field ${isCompactField(label.key) ? '' : 'morph-optional'}`}
            >
              <span className="morph-field-label">{label.text}</span>
              <span className="morph-field-box" />
            </div>
          ))}
          <div className="morph-file">
            <span className="morph-file-box">{fileHint}</span>
          </div>
          <div className="morph-actions">
            <span className="morph-submit">
              {submit}
              <svg className="morph-check ml-1" viewBox="0 0 16 16">
                <path d="M3 8.5 L6.5 12 L13 4.5" />
              </svg>
            </span>
            {envelope ? <p className="morph-note">{envelope}</p> : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function SheetRow({
  row,
  labels,
}: {
  row: string
  labels: { key: string; text: string }[]
}) {
  return (
    <>
      <div className="morph-cell axis">{row}</div>
      {labels.map((label, index) => (
        <div
          key={`${row}-${label.key}`}
            className={`morph-cell ${row === '1' ? 'head' : ''} ${index >= 4 ? 'morph-optional' : ''}`}
        >
          {row === '1' ? label.text : <span className="morph-bar" />}
        </div>
      ))}
    </>
  )
}
