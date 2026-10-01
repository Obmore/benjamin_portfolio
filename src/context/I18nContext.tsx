import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Locale, SiteContent } from '@/data/types'
import { contentHu } from '@/data/content.hu'

const LOCALE_STORAGE_KEY = 'portfolio-locale'

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
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
  if (stored === 'hu' || stored === 'en') return stored
  return 'hu'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale)
  const [enContent, setEnContent] = useState<SiteContent | null>(null)
  const [localeLoading, setLocaleLoading] = useState(() => getInitialLocale() === 'en')

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    localStorage.setItem(LOCALE_STORAGE_KEY, next)
  }, [])

  const toggleLocale = useCallback(() => {
    setLocale(locale === 'hu' ? 'en' : 'hu')
  }, [locale, setLocale])

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.classList.add('js')
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
