import { useEffect, useState } from 'react'

export function useActiveSection(sectionIds: string[]) {
  const [activeId, setActiveId] = useState(sectionIds[0] ?? '')

  useEffect(() => {
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null)

    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)

        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id)
        }
      },
      {
        rootMargin: '-35% 0px -55% 0px',
        threshold: [0.1, 0.25, 0.5],
      },
    )

    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [sectionIds])

  return activeId
}

export function scrollToSection(id: string) {
  const element = document.getElementById(id)
  if (!element) return

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const apply = () => {
    element.scrollIntoView({ behavior: 'auto', block: 'start' })
  }

  const doc = document as Document & {
    startViewTransition?: (update: () => void) => unknown
  }

  if (!reduce && typeof doc.startViewTransition === 'function') {
    try {
      doc.startViewTransition(apply)
      return
    } catch {
      apply()
      return
    }
  }

  element.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}
