export function TechnicalLines() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-20"
      viewBox="0 0 800 600"
      preserveAspectRatio="xMidYMid slice"
    >
      <path
        className="draw-path tech-line-1"
        d="M0 120 H200 L280 200 H520 L600 120 H800"
        fill="none"
        stroke="url(#lineGrad)"
        strokeWidth="1"
        pathLength="1"
      />
      <path
        className="draw-path tech-line-2"
        d="M0 380 H160 L240 300 H420 L500 380 H800"
        fill="none"
        stroke="url(#lineGrad)"
        strokeWidth="1"
        pathLength="1"
      />
      <circle className="pulse-opacity pulse-a" cx="280" cy="200" r="4" fill="var(--color-cyan)" />
      <circle className="pulse-opacity pulse-b" cx="500" cy="380" r="4" fill="var(--color-accent)" />
      <defs>
        <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0" />
          <stop offset="50%" stopColor="var(--color-accent)" />
          <stop offset="100%" stopColor="var(--color-cyan)" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  )
}
