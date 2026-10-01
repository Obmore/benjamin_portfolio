import type { CSSProperties, ReactNode } from 'react'
import { useRevealOnce } from '@/hooks/useRevealOnce'

interface CardProps {
  children: ReactNode
  className?: string
  delay?: number
}

export function Card({ children, className = '', delay = 0 }: CardProps) {
  const ref = useRevealOnce<HTMLDivElement>()

  return (
    <div
      ref={ref}
      data-reveal
      style={{ '--reveal-delay': `${delay}s` } as CSSProperties}
      className={`rounded-2xl border border-border/70 bg-surface/70 p-6 shadow-sm backdrop-blur-md ${className}`}
    >
      {children}
    </div>
  )
}
