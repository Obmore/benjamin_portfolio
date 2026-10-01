export const THEME_STORAGE_KEY = 'theme'
export const LIGHT_THEME_COLOR = '#FAFBFC'
export const DARK_THEME_COLOR = '#0B1A2E'

export type ThemeName = 'light' | 'dark'

export function getDocumentTheme(): ThemeName {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
}

export function applyTheme(theme: ThemeName) {
  const root = document.documentElement
  const meta = document.querySelector('meta[name="theme-color"]')

  if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark')
    root.style.colorScheme = 'dark'
    if (meta) meta.setAttribute('content', DARK_THEME_COLOR)
  } else {
    root.removeAttribute('data-theme')
    root.style.colorScheme = 'light'
    if (meta) meta.setAttribute('content', LIGHT_THEME_COLOR)
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // localStorage may be disabled
  }
}
