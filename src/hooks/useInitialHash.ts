import { useEffect } from 'react'
import { resolveAnchor, replaceLocationHash, stripJunkHash } from '@/lib/hash'
import { scrollToSection } from '@/hooks/useActiveSection'

function applyHash(behavior?: ScrollBehavior) {
  const raw = stripJunkHash()
  if (!raw) return

  const id = resolveAnchor(raw)
  if (id !== raw) replaceLocationHash(id)
  if (!document.getElementById(id)) return
  scrollToSection(id, behavior)
}

export function useInitialHash() {
  useEffect(() => {
    let cancelled = false
    const hadHash = Boolean(window.location.hash)
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
        applyHash('auto')
        if (hadHash) restoreSmooth()
      })
    }

    void run()

    const onHashChange = () => {
      applyHash()
    }

    window.addEventListener('hashchange', onHashChange)
    return () => {
      cancelled = true
      window.removeEventListener('hashchange', onHashChange)
    }
  }, [])
}
