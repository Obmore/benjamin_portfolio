import { useEffect, useRef, useState } from 'react'
import {
  FORBIDDEN_HASH_IDS,
  isHashTargetInView,
  rawLocationHash,
  replaceLocationHash,
} from '@/lib/hash'
import { prefersReducedMotion } from '@/lib/motion'

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
  syncHash = false,
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

    const syncUrlHash = (next: string) => {
      if (!syncHash || pendingSnap) return
      const raw = rawLocationHash()
      if (window.location.hash === '#' || FORBIDDEN_HASH_IDS.has(raw)) {
        replaceLocationHash(null)
        return
      }
      if (raw && isHashTargetInView(raw, HEADER_OFFSET_PX)) return
      replaceLocationHash(next || null)
    }

    const pick = (fromScroll = false) => {
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
      if (fromScroll) syncUrlHash(next)
    }

    const onScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        pick(true)
      })
    }

    const onResize = () => {
      recache()
      pick(false)
    }

    recache()
    pick(false)
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
  }, [factor, idsKey, syncHash, toDomId])

  return activeId
}

export function useActiveSection(sectionIds: string[]) {
  return useSectionSpy(sectionIds, 0.35, '', identityId, true)
}

export function useWorkIndex(ids: string[]) {
  return useSectionSpy(ids, 0.5, ids[0] ?? '', workDomId)
}

function sectionOffsetPx(element: Element) {
  return Number.parseFloat(getComputedStyle(element).scrollMarginTop) || 0
}

let pendingSnap: {
  stillTimer: number
  onEnd: () => void
  onScroll: () => void
  prevBehavior: string
} | null = null

function clearPendingSnap() {
  if (!pendingSnap) return
  window.clearTimeout(pendingSnap.stillTimer)
  window.removeEventListener('scrollend', pendingSnap.onEnd)
  window.removeEventListener('scroll', pendingSnap.onScroll)
  document.documentElement.style.scrollBehavior = pendingSnap.prevBehavior
  pendingSnap = null
}

function alignToSection(element: HTMLElement) {
  const root = document.documentElement

  const apply = () => {
    const prev = root.style.scrollBehavior
    root.style.scrollBehavior = 'auto'
    const delta = element.getBoundingClientRect().top - sectionOffsetPx(element)
    if (Math.abs(delta) > 2) root.scrollTop += delta
    root.style.scrollBehavior = prev
  }

  apply()

  let attempts = 0
  const retry = () => {
    const delta = element.getBoundingClientRect().top - sectionOffsetPx(element)
    if (Math.abs(delta) > 2) apply()
    attempts += 1
    if (attempts < 3 && Math.abs(element.getBoundingClientRect().top - sectionOffsetPx(element)) > 2) {
      requestAnimationFrame(retry)
    }
  }
  requestAnimationFrame(retry)
}

export function scrollToSection(id: string, behavior?: ScrollBehavior) {
  const element = document.getElementById(id)
  if (!element) return

  const prevBehavior = pendingSnap?.prevBehavior ?? document.documentElement.style.scrollBehavior
  clearPendingSnap()

  const instant = (behavior ?? (prefersReducedMotion() ? 'auto' : 'smooth')) === 'auto'
  const offset = sectionOffsetPx(element)
  const delta = element.getBoundingClientRect().top - offset
  const top = Math.max(0, window.scrollY + delta)
  const root = document.documentElement
  let lastY = window.scrollY

  const finish = () => {
    if (!pendingSnap) return
    alignToSection(element)
    clearPendingSnap()
  }

  if (Math.abs(delta) <= 1) {
    alignToSection(element)
    return
  }

  const onEnd = () => {
    finish()
  }

  const onScroll = () => {
    lastY = window.scrollY
    if (!pendingSnap) return
    window.clearTimeout(pendingSnap.stillTimer)
    pendingSnap.stillTimer = window.setTimeout(() => {
      if (!pendingSnap) return
      if (Math.abs(window.scrollY - lastY) <= 1) onEnd()
    }, 150)
  }

  window.addEventListener('scrollend', onEnd)
  window.addEventListener('scroll', onScroll, { passive: true })
  pendingSnap = { stillTimer: 0, onEnd, onScroll, prevBehavior }

  if (instant) {
    root.style.scrollBehavior = 'auto'
    root.scrollTop = top
  } else {
    window.scrollTo({ top, behavior: 'smooth' })
  }

  lastY = window.scrollY
  pendingSnap.stillTimer = window.setTimeout(() => {
    if (pendingSnap) onEnd()
  }, 150)
}
