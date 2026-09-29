import { useEffect, useState } from 'react'
import { engineScrollTo } from '@/lib/motionEngine'

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

  if (engineScrollTo(id)) return

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

export function bindInPageAnchors() {
  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const target = (event.target as Element | null)?.closest?.('a[href^="#"]')
    if (!(target instanceof HTMLAnchorElement)) return
    if (target.origin !== window.location.origin) return
    const id = decodeURIComponent(target.hash.replace(/^#/, ''))
    if (!id || !document.getElementById(id)) return
    event.preventDefault()
    if (window.location.hash !== target.hash) {
      history.pushState(null, '', target.hash)
    }
    scrollToSection(id)
  }

  document.addEventListener('click', onClick)
  return () => document.removeEventListener('click', onClick)
}
