import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { flushSync } from 'react-dom'
import type { Locale, SiteContent } from '@/data/types'
import { contentHu } from '@/data/content.hu'
import {
  canViewTransition,
  prefersReducedMotion,
  runLangCssFallback,
  startThemedViewTransition,
} from '@/lib/motion'
import { FORBIDDEN_HASH_IDS, rawLocationHash, resolveAnchor } from '@/lib/hash'
import { scrollToSection } from '@/hooks/useActiveSection'

const LOCALE_STORAGE_KEY = 'portfolio-locale'
const HEADER_OFFSET_PX = 64

interface I18nContextValue {
  locale: Locale
  content: SiteContent
  localeLoading: boolean
  setLocale: (locale: Locale) => void
  toggleLocale: () => void
}

const I18nContext = createContext<I18nContextValue | null>(null)

let enLoadPromise: Promise<SiteContent> | null = null

function loadEnglishContent(): Promise<SiteContent> {
  if (!enLoadPromise) {
    enLoadPromise = import('@/data/content.en').then((module) => module.contentEn)
  }
  return enLoadPromise
}

function getInitialLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (stored === 'hu' || stored === 'en') return stored
  } catch {
    // localStorage may be disabled
  }
  return 'hu'
}

function currentSectionHash() {
  const raw = rawLocationHash()
  if (!raw || FORBIDDEN_HASH_IDS.has(raw)) return ''
  const id = resolveAnchor(raw)
  return document.getElementById(id) ? id : ''
}

function captureVisibleSectionAnchor() {
  const sections = document.querySelectorAll<HTMLElement>('main section[id]')
  let best: { id: string; top: number; dist: number } | null = null
  for (const section of sections) {
    const rect = section.getBoundingClientRect()
    if (rect.bottom <= HEADER_OFFSET_PX || rect.top >= window.innerHeight) continue
    const dist = Math.abs(rect.top - HEADER_OFFSET_PX)
    if (!best || dist < best.dist) best = { id: section.id, top: rect.top, dist }
  }
  return best ? { id: best.id, top: best.top } : null
}

function restoreSectionAnchor(anchor: { id: string; top: number } | null) {
  if (!anchor) return
  const section = document.getElementById(anchor.id)
  if (!section) return
  const delta = section.getBoundingClientRect().top - anchor.top
  if (Math.abs(delta) >= 1) {
    window.scrollBy(0, delta)
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale)
  const [enContent, setEnContent] = useState<SiteContent | null>(null)
  const [localeLoading, setLocaleLoading] = useState(() => getInitialLocale() === 'en')
  const busyRef = useRef(false)
  const localeRef = useRef(locale)
  const enContentRef = useRef(enContent)
  localeRef.current = locale
  enContentRef.current = enContent

  const persistLocale = useCallback((next: Locale) => {
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next)
    } catch {
      // localStorage may be disabled
    }
  }, [])

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next)
      persistLocale(next)
    },
    [persistLocale],
  )

  const toggleLocale = useCallback(() => {
    if (busyRef.current) return
    busyRef.current = true

    void (async () => {
      const next: Locale = localeRef.current === 'hu' ? 'en' : 'hu'
      let busyTimer: ReturnType<typeof setTimeout> | undefined

      try {
        if (next === 'en' && !enContentRef.current) {
          busyTimer = window.setTimeout(() => setLocaleLoading(true), 300)
          const loaded = await loadEnglishContent()
          flushSync(() => {
            setEnContent(loaded)
            setLocaleLoading(false)
          })
        }

        const hashId = currentSectionHash()
        const anchor = hashId ? null : captureVisibleSectionAnchor()
        const settlePosition = () => {
          if (hashId) scrollToSection(hashId, 'auto')
          else restoreSectionAnchor(anchor)
        }
        const swap = () => {
          document.documentElement.lang = next
          flushSync(() => {
            setLocaleState(next)
          })
          persistLocale(next)
          settlePosition()
        }

        if (prefersReducedMotion()) {
          swap()
        } else if (canViewTransition()) {
          await startThemedViewTransition('lang', swap)
          settlePosition()
        } else {
          await runLangCssFallback(swap)
          settlePosition()
        }
      } finally {
        if (busyTimer !== undefined) window.clearTimeout(busyTimer)
        setLocaleLoading(false)
        busyRef.current = false
      }
    })()
  }, [persistLocale])

  useLayoutEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  useEffect(() => {
    if (locale !== 'en') {
      setLocaleLoading(false)
      return
    }

    if (enContent) {
      setLocaleLoading(false)
      return
    }

    let cancelled = false
    setLocaleLoading(true)
    loadEnglishContent()
      .then((content) => {
        if (!cancelled) {
          setEnContent(content)
          setLocaleLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLocaleLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [locale, enContent])

  const content = locale === 'en' && enContent ? enContent : contentHu

  const value = useMemo(
    () => ({
      locale,
      content,
      localeLoading,
      setLocale,
      toggleLocale,
    }),
    [locale, content, localeLoading, setLocale, toggleLocale],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n must be used within I18nProvider')
  return context
}
