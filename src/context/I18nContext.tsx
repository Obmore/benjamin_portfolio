import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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

function captureVisibleSectionAnchor() {
  const sections = document.querySelectorAll<HTMLElement>('main section[id]')
  for (const section of sections) {
    const rect = section.getBoundingClientRect()
    if (rect.bottom > HEADER_OFFSET_PX && rect.top < window.innerHeight) {
      return { id: section.id, top: rect.top }
    }
  }
  return null
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

        const anchor = captureVisibleSectionAnchor()
        const swap = () => {
          document.documentElement.lang = next
          flushSync(() => {
            setLocaleState(next)
          })
          persistLocale(next)
          restoreSectionAnchor(anchor)
        }

        if (prefersReducedMotion()) {
          swap()
        } else if (canViewTransition()) {
          await startThemedViewTransition('lang', swap)
        } else {
          await runLangCssFallback(swap)
        }
      } finally {
        if (busyTimer !== undefined) window.clearTimeout(busyTimer)
        setLocaleLoading(false)
        busyRef.current = false
      }
    })()
  }, [persistLocale])

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
