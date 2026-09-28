import type { CSSProperties } from 'react'

const LAYERS = ['structure', 'content', 'finished'] as const

export function ExplodedShot({
  src,
  alt,
  width,
  height,
  href,
  labels,
}: {
  src: string
  alt: string
  width: number
  height: number
  href?: string
  labels: { structure: string; content: string; finished: string }
}) {
  const picture = (
    <div className="explode-wrap">
      <div className="explode-stage">
        {LAYERS.map((key, index) => (
          <figure
            key={key}
            className={`explode-layer explode-layer-${index}`}
            style={{ '--layer': index } as CSSProperties}
          >
            {key === 'structure' ? (
              <StructureTrace />
            ) : (
              <img
                src={src}
                alt={index === 2 ? alt : ''}
                width={width}
                height={height}
                loading="lazy"
                decoding="async"
                aria-hidden={index !== 2}
              />
            )}
          </figure>
        ))}
      </div>
      <ul className="explode-legend">
        {LAYERS.map((key) => (
          <li key={key}>{labels[key]}</li>
        ))}
      </ul>
    </div>
  )

  if (!href) return picture
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="explode-link">
      {picture}
    </a>
  )
}

function StructureTrace() {
  return (
    <svg
      className="explode-structure"
      viewBox="0 0 1600 1000"
      preserveAspectRatio="xMidYMid slice"
      width="1600"
      height="1000"
      aria-hidden="true"
    >
      <rect x="1320" y="36" width="96" height="40" rx="6" />
      <rect x="1432" y="36" width="96" height="40" rx="6" />
      <rect x="430" y="168" width="740" height="36" />
      <rect x="680" y="228" width="240" height="40" />
      <rect x="280" y="290" width="1040" height="110" />
      <rect x="280" y="430" width="180" height="90" />
      <rect x="540" y="430" width="180" height="90" />
      <rect x="880" y="430" width="180" height="90" />
      <rect x="1140" y="430" width="180" height="90" />
      <rect x="430" y="545" width="740" height="330" rx="18" />
      <rect x="490" y="620" width="620" height="70" rx="8" />
      <rect x="490" y="720" width="620" height="80" rx="12" />
      <rect x="680" y="900" width="240" height="28" />
    </svg>
  )
}
