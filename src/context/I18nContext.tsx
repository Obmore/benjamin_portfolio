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

const LOCALE_STORAGE_KEY = 'portfolio-locale'
const HEADER_OFFSET_PX = 64

type ViewportAnchor = { sel: string; top: number }

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

function selectorFor(el: HTMLElement): string {
  if (el.id) return `#${CSS.escape(el.id)}`
  const parts: string[] = []
  let node: HTMLElement | null = el
  while (node && node !== document.body) {
    if (node.id) {
      parts.unshift(`#${CSS.escape(node.id)}`)
      break
    }
    const parent = node.parentElement
    if (!parent) break
    const tag = node.tagName.toLowerCase()
    let index = 1
    let pred = node.previousElementSibling
    while (pred) {
      if (pred.tagName === node.tagName) index += 1
      pred = pred.previousElementSibling
    }
    parts.unshift(`${tag}:nth-of-type(${index})`)
    node = parent
  }
  return parts.join('>')
}

function captureViewportAnchor(): ViewportAnchor | null {
  const x = Math.min(Math.max(24, window.innerWidth / 2), window.innerWidth - 24)
  let probe = document.elementFromPoint(x, HEADER_OFFSET_PX + 2)
  if (probe instanceof Element && probe.closest('header, .skip-link')) {
    probe = document.elementFromPoint(x, HEADER_OFFSET_PX + 12)
  }
  if (!(probe instanceof Element)) return null
  const target = probe.closest<HTMLElement>('article, [data-reveal], section[id], [id]')
  if (!target || target.id === 'root' || target.id === 'main') return null
  return { sel: selectorFor(target), top: target.getBoundingClientRect().top }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale)
  const [enContent, setEnContent] = useState<SiteContent | null>(null)
  const [localeLoading, setLocaleLoading] = useState(() => getInitialLocale() === 'en')
  const busyRef = useRef(false)
  const localeRef = useRef(locale)
  const enContentRef = useRef(enContent)
  const pendingAnchorRef = useRef<ViewportAnchor | null>(null)
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

        pendingAnchorRef.current = captureViewportAnchor()
        const swap = () => {
          document.documentElement.lang = next
          flushSync(() => {
            setLocaleState(next)
          })
          persistLocale(next)
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

  useLayoutEffect(() => {
    document.documentElement.lang = locale
    const anchor = pendingAnchorRef.current
    if (!anchor) return
    pendingAnchorRef.current = null
    const el = document.querySelector(anchor.sel)
    if (!(el instanceof HTMLElement)) return
    const delta = el.getBoundingClientRect().top - anchor.top
    if (Math.abs(delta) < 0.5) return
    window.scrollTo({ top: window.scrollY + delta, behavior: 'instant' })
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
