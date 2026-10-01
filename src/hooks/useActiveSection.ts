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

  document.querySelectorAll<HTMLElement>('main section').forEach((section) => {
    section.style.contentVisibility = 'visible'
  })

  const instant = (behavior ?? (prefersReducedMotion() ? 'auto' : 'smooth')) === 'auto'
  const top = Math.max(0, window.scrollY + element.getBoundingClientRect().top - HEADER_OFFSET_PX)
  const root = document.documentElement

  const snap = () => {
    const delta = element.getBoundingClientRect().top - HEADER_OFFSET_PX
    if (Math.abs(delta) > 2) root.scrollTop += delta
  }

  if (instant) {
    const prev = root.style.scrollBehavior
    root.style.scrollBehavior = 'auto'
    root.scrollTop = top
    snap()
    root.style.scrollBehavior = prev
    return
  }

  window.scrollTo({ top, behavior: 'smooth' })
  window.setTimeout(() => {
    const prev = root.style.scrollBehavior
    root.style.scrollBehavior = 'auto'
    snap()
    root.style.scrollBehavior = prev
  }, 500)
}
