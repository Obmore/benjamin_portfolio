import { useEffect, useLayoutEffect } from 'react'
import { resolveAnchor, replaceLocationHash, stripJunkHash, rawLocationHash } from '@/lib/hash'
import { scrollToSection } from '@/hooks/useActiveSection'

function applyHash(behavior?: ScrollBehavior) {
  const raw = stripJunkHash()
  if (!raw) return ''

  const id = resolveAnchor(raw)
  if (id !== raw) replaceLocationHash(id)
  if (!document.getElementById(id)) return ''
  scrollToSection(id, behavior)
  return id
}

function scrollToHashSync() {
  const raw = stripJunkHash()
  if (!raw) return
  const id = resolveAnchor(raw)
  if (id !== raw) replaceLocationHash(id)
  const element = document.getElementById(id)
  if (!element) return

  const offset = Number.parseFloat(getComputedStyle(element).scrollMarginTop) || 0
  const top = Math.max(0, window.scrollY + element.getBoundingClientRect().top - offset)
  const root = document.documentElement
  const prev = root.style.scrollBehavior
  root.style.scrollBehavior = 'auto'
  root.scrollTop = top
  const delta = element.getBoundingClientRect().top - offset
  if (Math.abs(delta) > 1) root.scrollTop += delta
  root.style.scrollBehavior = prev
}

function markViewportRevealsInstant() {
  const vh = window.innerHeight
  const vw = window.innerWidth
  const nodes = document.querySelectorAll<HTMLElement>('[data-reveal]')
  for (const node of nodes) {
    const rect = node.getBoundingClientRect()
    if (rect.bottom > 0 && rect.top < vh && rect.right > 0 && rect.left < vw) {
      node.setAttribute('data-revealed', 'instant')
    }
  }
}

function realignHash(id: string) {
  const element = document.getElementById(id)
  if (!element) return
  const offset = Number.parseFloat(getComputedStyle(element).scrollMarginTop) || 0
  const delta = element.getBoundingClientRect().top - offset
  if (Math.abs(delta) <= 2) return
  const root = document.documentElement
  const prev = root.style.scrollBehavior
  root.style.scrollBehavior = 'auto'
  root.scrollTop += delta
  root.style.scrollBehavior = prev
}

export function syncInitialHash() {
  const hadHash = Boolean(window.location.hash) || /#$/.test(window.location.href)
  if (hadHash) document.documentElement.style.scrollBehavior = 'auto'
  scrollToHashSync()
  if (hadHash) markViewportRevealsInstant()
  return hadHash
}

export function scheduleHashRealign() {
  const retryTimers: number[] = []
  const hadHash = Boolean(window.location.hash) || /#$/.test(window.location.href)
  const raw = rawLocationHash()
  const id = raw ? resolveAnchor(raw) : ''
  let cancelled = false

  const restoreSmooth = () => {
    requestAnimationFrame(() => {
      if (!cancelled) document.documentElement.style.scrollBehavior = ''
    })
  }

  void (async () => {
    try {
      if (document.fonts?.ready) await document.fonts.ready
    } catch {
      // Ignore font loading errors; still realign to the hash.
    }
    if (cancelled) return
    if (id) {
      realignHash(id)
      for (const ms of [50, 200, 500, 900]) {
        retryTimers.push(
          window.setTimeout(() => {
            if (!cancelled) realignHash(id)
          }, ms),
        )
      }
    }
    if (hadHash) {
      retryTimers.push(window.setTimeout(restoreSmooth, id ? 920 : 0))
    }
  })()

  return () => {
    cancelled = true
    for (const timer of retryTimers) window.clearTimeout(timer)
  }
}

export function useInitialHash() {
  useLayoutEffect(() => {
    syncInitialHash()
  }, [])

  useEffect(() => {
    const onHashChange = () => {
      applyHash()
    }
    window.addEventListener('hashchange', onHashChange)
    const stopRealign = scheduleHashRealign()
    return () => {
      stopRealign()
      window.removeEventListener('hashchange', onHashChange)
    }
  }, [])
}
