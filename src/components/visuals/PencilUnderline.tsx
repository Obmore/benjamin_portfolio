import { useRef, type ReactNode } from 'react'
import { useInViewOnce } from '@/hooks/useInViewOnce'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { MOTION } from '@/lib/motion'

export function PencilUnderline({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInViewOnce(ref, { threshold: 0.6 })
  const reduced = usePrefersReducedMotion()

  return (
    <span ref={ref} className="pencil-underline">
      {children}
      <svg
        className={`pencil-stroke ${inView && !reduced ? 'is-drawn' : ''}`}
        viewBox="0 0 120 10"
        aria-hidden="true"
        style={{ position: 'absolute', left: 0, right: 0, bottom: '-0.15em', width: '100%', height: '0.55em', pointerEvents: 'none' }}
      >
        <path
          d="M1.5 6.2 C 18 2.4, 32 8.1, 48 5.2 S 78 2.8, 96 6.1 S 112 7.4, 118.5 4.8"
          fill="none"
          stroke={MOTION.ink}
          strokeWidth={MOTION.strokeWidth}
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}

