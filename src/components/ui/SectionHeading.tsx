import { useRef } from 'react'
import { useInViewOnce } from '@/hooks/useInViewOnce'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

interface SectionHeadingProps {
  title: string
  subtitle?: string
  label: string
  number: string
  titleId?: string
  compact?: boolean
}

export function SectionHeading({
  title,
  subtitle,
  label,
  number,
  titleId,
  compact = false,
}: SectionHeadingProps) {
  return (
    <div className={`max-w-2xl ${compact ? 'mb-3 md:mb-8' : 'mb-5 md:mb-10'}`}>
      <div className={`flex items-center gap-3 ${compact ? 'mb-1.5 md:mb-3' : 'mb-3'}`}>
        <span className="font-mono text-xs tracking-[0.18em] text-line">{number}</span>
        <span className="font-mono text-xs uppercase tracking-[0.18em] text-line">
          {label}
        </span>
      </div>
      <h2
        id={titleId}
        className={`font-semibold tracking-tight text-foreground ${
          compact ? 'text-2xl md:text-4xl' : 'text-3xl md:text-4xl'
        }`}
      >
        {title}
      </h2>
      {subtitle ? <p className="mt-3 text-muted">{subtitle}</p> : null}
      <DimensionLine className={compact ? 'mt-2 md:mt-4' : 'mt-4'} />
    </div>
  )
}

export function DimensionLine({
  className = '',
  label,
}: {
  className?: string
  label?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInViewOnce(ref, { threshold: 0.4 })
  const reduced = usePrefersReducedMotion()

  return (
    <div
      ref={ref}
      className={`dimension-line ${inView && !reduced ? 'is-drawn' : ''} ${className}`}
    >
      <svg viewBox="0 0 240 16" aria-hidden="true">
        <path className="dim-stroke" d="M8 8 H232" />
        <path className="dim-stroke" d="M8 3 V13" />
        <path className="dim-stroke" d="M232 3 V13" />
        <path className="dim-stroke" d="M8 8 L14 4 M8 8 L14 12" />
        <path className="dim-stroke" d="M232 8 L226 4 M232 8 L226 12" />
      </svg>
      {label ? (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/80 px-2 font-mono text-[11px] text-line">
          {label}
        </span>
      ) : null}
    </div>
  )
}
