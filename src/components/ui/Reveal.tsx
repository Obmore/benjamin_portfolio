import { useRef, type ReactNode } from 'react'
import { useInViewOnce } from '@/hooks/useInViewOnce'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

export function Reveal({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInViewOnce(ref, { threshold: 0.18 })
  const reduced = usePrefersReducedMotion()

  return (
    <div
      ref={ref}
      className={`${!reduced && inView ? 'reveal-play' : ''} ${className}`}
    >
      {children}
    </div>
  )
}
