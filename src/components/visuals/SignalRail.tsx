export function SignalSegment({ staticDraw = false }: { staticDraw?: boolean }) {
  return (
    <svg
      className={`signal-seg ${staticDraw ? 'is-static' : ''}`}
      viewBox="0 0 12 200"
      preserveAspectRatio="none"
      width="12"
      height="100%"
      aria-hidden="true"
    >
      <path className="signal-vert" pathLength="1" d="M6 0 V200" />
      <path className="signal-tick" pathLength="1" d="M6 10 H12" />
    </svg>
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
