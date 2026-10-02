import { useEffect, useRef } from 'react'

let observer: IntersectionObserver | null = null

function getObserver(): IntersectionObserver {
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.setAttribute('data-revealed', 'true')
          observer?.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -15% 0px' },
    )
  }
  return observer
}

export function useRevealOnce<T extends Element = HTMLElement>() {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    if (element.hasAttribute('data-revealed')) return

    const obs = getObserver()
    obs.observe(element)
    return () => {
      obs.unobserve(element)
    }
  }, [])

  return ref
}
