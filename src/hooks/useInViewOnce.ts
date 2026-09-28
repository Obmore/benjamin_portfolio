import { useEffect, useState, type RefObject } from 'react'

export function useInViewOnce<T extends Element>(
  ref: RefObject<T | null>,
  options?: IntersectionObserverInit,
) {
  const [inView, setInView] = useState(false)
  const threshold = options?.threshold ?? 0.35
  const rootMargin = options?.rootMargin

  useEffect(() => {
    const element = ref.current
    if (!element || inView) return

    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setInView(true)
        observer.disconnect()
      }
    }, { threshold, rootMargin })

    observer.observe(element)
    return () => observer.disconnect()
  }, [ref, inView, threshold, rootMargin])

  return inView
}
