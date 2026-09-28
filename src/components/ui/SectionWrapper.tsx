import type { ReactNode } from 'react'

interface SectionWrapperProps {
  id: string
  children: ReactNode
  className?: string
}

export function SectionWrapper({ id, children, className = '' }: SectionWrapperProps) {
  const hasPadding = className.split(/\s+/).some((token) => token.startsWith('py-') || token.startsWith('!py-'))
  return (
    <section
      id={id}
      className={`section-crosses scroll-mt-16 ${hasPadding ? '' : 'py-6 md:py-14'} ${className}`}
    >
      <div className="mx-auto max-w-6xl px-5 md:px-8">{children}</div>
    </section>
  )
}
