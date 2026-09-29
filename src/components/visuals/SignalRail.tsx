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
  const inView = useInViewOnce(ref, { threshold: 0.4 })
  const reduced = usePrefersReducedMotion()
  const lit = reduced || inView

  return (
    <div
      ref={ref}
      className={`signal-finale ${lit ? 'is-lit' : ''}`}
      data-testid="finale"
    >
      <svg
        className="finale-lamp"
        viewBox="0 0 160 56"
        width="148"
        height="52"
        aria-hidden="true"
      >
        <path className="finale-ink" d="M4 28 H52" />
        <path className="finale-lever finale-lever-open" d="M52 28 L70 10" />
        <path className="finale-lever finale-lever-closed" d="M52 28 H80" />
        <circle className="finale-ink-fill" cx="52" cy="28" r="2.2" />
        <path className="finale-ink" d="M80 28 H106" />
        <circle className="finale-lamp-glass" cx="128" cy="28" r="16" />
        <path className="finale-ink" d="M117 17 L139 39 M139 17 L117 39" />
        <circle className="finale-lamp-pad" cx="128" cy="28" r="5" />
      </svg>
      <div className="finale-copy">{children}</div>
    </div>
  )
}
