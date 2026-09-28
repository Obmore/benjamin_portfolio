import type { ReactNode } from 'react'

interface PanelProps {
  children: ReactNode
  className?: string
  padded?: boolean
  crop?: boolean
}

export function Panel({
  children,
  className = '',
  padded = true,
  crop = true,
}: PanelProps) {
  return (
    <div
      className={`${crop ? 'crop-marks' : ''} rounded-[6px] border border-line/25 bg-surface ${
        padded ? 'p-5' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}
