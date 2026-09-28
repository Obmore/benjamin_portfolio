import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useI18n } from '@/context/I18nContext'
import { useInViewOnce } from '@/hooks/useInViewOnce'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

const MOBILE_PLACEMENT = [
  { column: 1, row: 1 },
  { column: 2, row: 1 },
  { column: 2, row: 2 },
  { column: 1, row: 2 },
] as const

export function ProcessDiagram() {
  const { content } = useI18n()
  const boardRef = useRef<HTMLDivElement>(null)
  const inView = useInViewOnce(boardRef, { threshold: 0.35 })
  const reduced = usePrefersReducedMotion()
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    setArmed(!reduced)
  }, [reduced])

  const running = armed && inView && !reduced

  return (
    <section className="process-diagram" aria-labelledby="process-title">
      <h3 id="process-title" className="process-title">
        {content.services.processTitle}
      </h3>
      <div
        ref={boardRef}
        className={`process-board ${armed ? 'is-armed' : ''} ${running ? 'is-run' : ''}`}
      >
        <svg
          className="process-trace process-trace-mobile"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          width="100%"
          height="100%"
          aria-hidden="true"
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        >
          <path className="process-path" d="M18 14 H82 V62 H18" />
        </svg>
        <svg
          className="process-trace process-trace-desk"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          width="100%"
          height="100%"
          aria-hidden="true"
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        >
          <path className="process-path" d="M8 10 H92 M8 10 V22 M36 10 V22 M64 10 V22 M92 10 V22" />
        </svg>
        <span className="process-dot" aria-hidden="true" style={{ position: 'absolute' }} />
        <ol className="process-nodes">
          {content.services.processSteps.map((step, index) => {
            const place = MOBILE_PLACEMENT[index]
            return (
              <li
                key={step.title}
                className="process-node"
                style={
                  {
                    '--step': index,
                    '--col': place?.column ?? 1,
                    '--row': place?.row ?? 1,
                  } as CSSProperties
                }
              >
                <span className="process-pad" aria-hidden="true" />
                <p className="process-index">{String(index + 1).padStart(2, '0')}</p>
                <p className="process-node-title">{step.title}</p>
                <p className="process-node-desc">{step.description}</p>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
