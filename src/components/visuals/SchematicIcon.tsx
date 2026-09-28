import { useRef } from 'react'
import { useInViewOnce } from '@/hooks/useInViewOnce'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { MOTION } from '@/lib/motion'

export type SchematicKind = 'transistor' | 'antenna' | 'resistor' | 'battery'

const PATHS: Record<SchematicKind, string> = {
  transistor:
    'M4 12 H10 M10 4 V20 M10 12 L18 6 M16.2 6.2 L18 6 L16.6 8.1 M18 6 V3 M10 12 L18 18 M18 18 V21',
  antenna: 'M12 21 V9 M12 9 L6 4 M12 9 L18 4 M8.5 7.2 A5 5 0 0 1 15.5 7.2 M10 5.6 A3 3 0 0 1 14 5.6',
  resistor: 'M2 12 H6 L8 7 L12 17 L16 7 L18 12 H22',
  battery: 'M3 12 H8 M8 7 V17 M11 5 V19 M14 7 V17 M14 12 H21',
}

export function SchematicIcon({ kind }: { kind: SchematicKind }) {
  const ref = useRef<SVGSVGElement>(null)
  const inView = useInViewOnce(ref, { threshold: 0.5 })
  const reduced = usePrefersReducedMotion()

  return (
    <svg
      ref={ref}
      className={`schematic-icon ${inView && !reduced ? 'is-drawn' : ''}`}
      viewBox="0 0 24 24"
      width="28"
      height="28"
      aria-hidden="true"
    >
      <path
        d={PATHS[kind]}
        fill="none"
        stroke={MOTION.ink}
        strokeWidth={MOTION.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
