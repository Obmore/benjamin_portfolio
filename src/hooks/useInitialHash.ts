import { useEffect } from 'react'
import { resolveAnchor } from '@/lib/anchors'
import { scrollToSection } from '@/hooks/useActiveSection'

function applyHash(behavior?: ScrollBehavior) {
  const raw = window.location.hash.replace(/^#/, '')
  if (!raw) return

  const id = resolveAnchor(raw)
  if (id !== raw) {
    history.replaceState(null, '', `#${id}`)
  }
  scrollToSection(id, behavior)
}

export function useInitialHash() {
  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        if (document.fonts?.ready) await document.fonts.ready
      } catch {
        // Ignore font loading errors; still scroll to the hash.
      }
      if (cancelled) return
      requestAnimationFrame(() => {
        if (!cancelled) applyHash('auto')
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
