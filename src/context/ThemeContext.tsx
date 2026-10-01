import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react'
import { flushSync } from 'react-dom'
import { applyTheme, getDocumentTheme, type ThemeName } from '@/lib/theme'
import { canViewTransition, prefersReducedMotion, startThemedViewTransition } from '@/lib/motion'

interface ThemeContextValue {
  theme: ThemeName
  dark: boolean
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>(() => getDocumentTheme())

  const toggleTheme = useCallback(() => {
    const next: ThemeName = theme === 'dark' ? 'light' : 'dark'
    const update = () => {
      flushSync(() => {
        applyTheme(next)
        setTheme(next)
      })
    }

    if (prefersReducedMotion() || !canViewTransition()) {
      update()
      return
    }

    void startThemedViewTransition('theme', update)
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
