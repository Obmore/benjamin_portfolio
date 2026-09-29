import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useInViewOnce } from '@/hooks/useInViewOnce'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

export function BrowserFrame({
  domain,
  children,
}: {
  domain: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInViewOnce(ref, { threshold: 0.45 })
  const reduced = usePrefersReducedMotion()
  const [coarse, setCoarse] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(hover: none)')
    const update = () => setCoarse(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  const autoScroll = inView && coarse && !reduced

  return (
    <div
      ref={ref}
      className={`browser-frame ${autoScroll ? 'is-auto-scroll' : ''}`}
    >
      <div className="flex items-center gap-1.5 border-b border-line/20 px-2.5 py-1.5">
        <span className="h-2 w-2 rounded-full border border-line/40" />
        <span className="h-2 w-2 rounded-full border border-line/40" />
        <span className="h-2 w-2 rounded-full border border-line/40" />
        <span className="ml-2 min-w-0 truncate font-mono text-[11px] text-muted">
          {domain}
        </span>
      </div>
      <div className="browser-viewport">{children}</div>
    </div>
  )
}
