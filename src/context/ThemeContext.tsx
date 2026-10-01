import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useState,
  type ReactNode,
} from 'react'
import { flushSync } from 'react-dom'
import { applyTheme, getDocumentTheme, persistTheme, type ThemeName } from '@/lib/theme'
import { startThemedViewTransition } from '@/lib/motion'

interface ThemeContextValue {
  theme: ThemeName
  dark: boolean
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>(() => getDocumentTheme())

  useLayoutEffect(() => {
    applyTheme(theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    const next: ThemeName = theme === 'dark' ? 'light' : 'dark'
    void startThemedViewTransition('theme', () => {
      applyTheme(next)
      persistTheme(next)
      flushSync(() => setTheme(next))
    })
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, dark: theme === 'dark', toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
