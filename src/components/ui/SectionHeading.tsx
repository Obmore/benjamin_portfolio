import { useRef } from 'react'
import { useInViewOnce } from '@/hooks/useInViewOnce'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

interface SectionHeadingProps {
  title: string
  subtitle?: string
  label: string
  number: string
  titleId?: string
}

export function SectionHeading({
  title,
  subtitle,
  label,
  number,
  titleId,
}: SectionHeadingProps) {
  return (
    <div className="mb-6 max-w-2xl md:mb-10">
      <div className="mb-3 flex items-center gap-3">
        <span className="font-mono text-xs tracking-[0.18em] text-line">{number}</span>
        <span className="font-mono text-xs uppercase tracking-[0.18em] text-line">
          {label}
        </span>
      </div>
      <h2
        id={titleId}
        className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl"
      >
        {title}
      </h2>
      {subtitle ? <p className="mt-3 text-muted">{subtitle}</p> : null}
      <DimensionLine className="mt-4" />
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
