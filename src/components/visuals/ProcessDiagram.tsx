import type { CSSProperties } from 'react'
import { useI18n } from '@/context/I18nContext'

const MOBILE_PLACEMENT = [
  { column: 1, row: 1 },
  { column: 2, row: 1 },
  { column: 2, row: 2 },
  { column: 1, row: 2 },
] as const

export function ProcessDiagram() {
  const { content } = useI18n()

  return (
    <section className="process-diagram" aria-labelledby="process-title">
      <h3 id="process-title" className="process-title">
        {content.services.processTitle}
      </h3>
      <div className="process-board">
        <svg
          className="process-trace process-trace-mobile"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          width="100%"
          height="100%"
          aria-hidden="true"
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        >
          <path className="process-path" pathLength="1" d="M18 14 H82 V62 H18" />
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
          <path className="process-path" pathLength="1" d="M8 10 H92" />
        </svg>
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
