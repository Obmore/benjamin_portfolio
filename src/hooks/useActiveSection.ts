import { useEffect, useRef, useState } from 'react'

const HEADER_OFFSET_PX = 64

function identityId(id: string) {
  return id
}

function workDomId(id: string) {
  return `munka-${id}`
}

function useSectionSpy(
  ids: string[],
  factor: number,
  fallback: string,
  toDomId: (id: string) => string,
) {
  const [activeId, setActiveId] = useState(fallback)
  const idsKey = ids.join(',')
  const fallbackRef = useRef(fallback)
  fallbackRef.current = fallback

  useEffect(() => {
    const idList = idsKey.split(',').filter(Boolean)
    if (idList.length === 0) return

    const tops = new Float64Array(idList.length)
    let pageHeight = 0
    let frame = 0
    let last = fallbackRef.current

    const recache = () => {
      const y = window.scrollY
      for (let i = 0; i < idList.length; i += 1) {
        const element = document.getElementById(toDomId(idList[i] as string))
        tops[i] = element ? y + element.getBoundingClientRect().top : Number.POSITIVE_INFINITY
      }
      pageHeight = document.documentElement.scrollHeight
    }

    const pick = () => {
      const y = window.scrollY
      const vh = window.innerHeight
      let next = fallbackRef.current
      if (idList.length > 0 && y + vh >= pageHeight - 2) {
        next = idList[idList.length - 1] as string
      } else {
        const threshold = y + HEADER_OFFSET_PX + factor * vh
        for (let i = 0; i < idList.length; i += 1) {
          if (tops[i] <= threshold) next = idList[i] as string
        }
      }
      if (next !== last) {
        last = next
        setActiveId(next)
      }
    }

    const onScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        pick()
      })
    }

    const onResize = () => {
      recache()
      pick()
    }

    recache()
    pick()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    const observer = new ResizeObserver(onResize)
    observer.observe(document.body)

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      observer.disconnect()
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [factor, idsKey, toDomId])

  return activeId
}

export function useActiveSection(sectionIds: string[]) {
  return useSectionSpy(sectionIds, 0.35, '', identityId)
}

export function useWorkIndex(ids: string[]) {
  return useSectionSpy(ids, 0.5, ids[0] ?? '', workDomId)
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
    window.dispatchEvent(new Event('resize'))
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
