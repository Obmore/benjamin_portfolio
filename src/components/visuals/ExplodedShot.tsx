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
      <rect x="20" y="20" width="1560" height="960" />
      <rect x="1368" y="28" width="88" height="36" rx="6" />
      <rect x="1472" y="28" width="88" height="36" rx="6" />
      <rect x="430" y="158" width="740" height="28" />
      <rect x="700" y="210" width="200" height="32" />
      <rect x="300" y="268" width="1000" height="100" />
      <rect x="360" y="412" width="150" height="78" />
      <rect x="620" y="412" width="150" height="78" />
      <rect x="860" y="412" width="150" height="78" />
      <rect x="1100" y="412" width="150" height="78" />
      <rect x="430" y="530" width="740" height="320" rx="18" />
      <rect x="490" y="598" width="620" height="64" rx="8" />
      <rect x="490" y="688" width="620" height="72" rx="12" />
      <rect x="680" y="868" width="240" height="24" />
    </svg>
  )
}
