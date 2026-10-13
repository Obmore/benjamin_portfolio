import { createContext } from 'react'
import type { Locale, SiteContent } from '@/data/types'

export interface I18nContextValue {
  locale: Locale
  content: SiteContent
  localeLoading: boolean
  localeError: boolean
  toggleLocale: () => void
}

export const I18nContext = createContext<I18nContextValue | null>(null)
