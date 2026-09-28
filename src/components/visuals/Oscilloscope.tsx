import { useRef } from 'react'
import { useInViewOnce } from '@/hooks/useInViewOnce'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

export function Oscilloscope() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInViewOnce(ref, { threshold: 0.5 })
  const reduced = usePrefersReducedMotion()

  return (
    <div
      ref={ref}
      className={`scope-stage crop-marks mb-8 overflow-hidden rounded-[6px] border border-line/25 bg-surface ${
        inView && !reduced ? 'is-run' : ''
      }`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 400 56" className="h-14 w-full">
        <path
          d="M0 12 H400 M0 28 H400 M0 44 H400 M80 4 V52 M160 4 V52 M240 4 V52 M320 4 V52"
          stroke="currentColor"
          className="text-line/15"
          strokeWidth={1.5}
          fill="none"
        />
        <path
          d="M0 28 H36 L48 10 L72 46 L96 28 H148 L164 14 L196 42 L220 28 H276 L296 8 L320 48 L344 28 H400"
          fill="none"
          stroke="currentColor"
          className="text-line"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
        <rect
          className="scope-sweep text-line"
          x="0"
          y="4"
          width="3"
          height="48"
          fill="currentColor"
        />
      </svg>
    </div>
  )
}
