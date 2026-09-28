import { useRef, type ReactNode } from 'react'
import { useInViewOnce } from '@/hooks/useInViewOnce'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

export function SignalSegment({ staticDraw = false }: { staticDraw?: boolean }) {
  return (
    <div className={`signal-seg ${staticDraw ? 'is-static' : ''}`} aria-hidden="true">
      <span className="signal-vert" />
      <svg className="signal-jog" viewBox="0 0 12 12" width="12" height="12">
        <path className="signal-tick" pathLength="1" d="M4 6 H12" />
        <circle className="signal-pad" cx="4" cy="6" r="2.2" />
      </svg>
    </div>
  )
}

export function SignalMeasure() {
  return (
    <div className="signal-measure" aria-hidden="true">
      <span className="signal-dot" />
    </div>
  )
}

export function SheetFrame() {
  return <div className="sheet-frame" aria-hidden="true" />
}

export function FinaleSwitch({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInViewOnce(ref, { threshold: 0.6 })
  const reduced = usePrefersReducedMotion()

  return (
    <div ref={ref} className={`signal-finale ${inView && !reduced ? 'is-pulse' : ''}`}>
      {children}
    </div>
  )
}
