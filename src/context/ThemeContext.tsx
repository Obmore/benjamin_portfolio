import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readTheme(): Theme {
  return 'light'
}

function applyTheme(_theme: Theme) {
  document.documentElement.classList.remove('dark')
  document.documentElement.style.colorScheme = 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme] = useState<Theme>(readTheme)

  useEffect(() => {
    applyTheme('light')
  }, [])

  const toggleTheme = useCallback(() => {
    applyTheme('light')
  }, [])

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
