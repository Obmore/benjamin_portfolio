import { useEffect } from 'react'
import { resolveAnchor, replaceLocationHash, stripJunkHash } from '@/lib/hash'
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

export function useInitialHash() {
  useEffect(() => {
    let cancelled = false
    const retryTimers: number[] = []
    const hadHash = Boolean(window.location.hash) || /#$/.test(window.location.href)
    if (hadHash) {
      document.documentElement.style.scrollBehavior = 'auto'
    }

    const restoreSmooth = () => {
      requestAnimationFrame(() => {
        if (!cancelled) document.documentElement.style.scrollBehavior = ''
      })
    }

    const run = async () => {
      try {
        if (document.fonts?.ready) await document.fonts.ready
      } catch {
        // Ignore font loading errors; still scroll to the hash.
      }
      if (cancelled) return
      requestAnimationFrame(() => {
        if (cancelled) return
        const id = applyHash('auto')
        if (hadHash) restoreSmooth()
        if (id) {
          for (const ms of [50, 200, 500]) {
            retryTimers.push(
              window.setTimeout(() => {
                if (!cancelled) realignHash(id)
              }, ms),
            )
          }
        }
      })
    }

    void run()

    const onHashChange = () => {
      applyHash()
    }

    window.addEventListener('hashchange', onHashChange)
    return () => {
      cancelled = true
      for (const timer of retryTimers) window.clearTimeout(timer)
      window.removeEventListener('hashchange', onHashChange)
    }
  }, [])
}
