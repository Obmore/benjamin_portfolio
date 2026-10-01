import { useEffect, useState } from 'react'

const HEADER_OFFSET_PX = 64

export function useActiveSection(sectionIds: string[]) {
  const [activeId, setActiveId] = useState('')
  const idsKey = sectionIds.join(',')

  useEffect(() => {
    const idList = idsKey.split(',').filter(Boolean)
    const elements = idList
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null)

    if (elements.length === 0) return

    const update = () => {
      let current = ''
      for (const element of elements) {
        if (element.getBoundingClientRect().top <= HEADER_OFFSET_PX + 2) {
          current = element.id
        }
      }
      setActiveId(current)
    }

    const observer = new IntersectionObserver(update, {
      rootMargin: `-${HEADER_OFFSET_PX}px 0px -70% 0px`,
      threshold: [0, 0.1, 0.25, 0.5, 1],
    })

    elements.forEach((element) => observer.observe(element))
    update()
    return () => observer.disconnect()
  }, [idsKey])

  return activeId
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function scrollToSection(id: string, behavior?: ScrollBehavior) {
  const element = document.getElementById(id)
  if (!element) return

  element.style.contentVisibility = 'visible'
  const top = window.scrollY + element.getBoundingClientRect().top - HEADER_OFFSET_PX
  window.scrollTo({
    top: Math.max(0, top),
    behavior: behavior ?? (prefersReducedMotion() ? 'auto' : 'smooth'),
  })
}
