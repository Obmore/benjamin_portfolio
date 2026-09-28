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
            <img
              src={src}
              alt={index === 2 ? alt : ''}
              width={width}
              height={height}
              loading="lazy"
              decoding="async"
              aria-hidden={index !== 2}
            />
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
