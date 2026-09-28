import type { ReactNode } from 'react'

interface SectionWrapperProps {
  id: string
  children: ReactNode
  className?: string
}

export function SectionWrapper({ id, children, className = '' }: SectionWrapperProps) {
  return (
    <section
      id={id}
      className={`section-crosses scroll-mt-16 py-10 md:py-16 ${className}`}
    >
      <div className="mx-auto max-w-6xl px-5 md:px-8">{children}</div>
    </section>
  )
}
