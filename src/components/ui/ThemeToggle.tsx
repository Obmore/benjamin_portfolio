import { useI18n } from '@/context/I18nContext'
import { useTheme } from '@/context/ThemeContext'
import { Icon } from '@/components/ui/Icon'

export function ThemeToggle() {
  const { content } = useI18n()
  const { dark, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      aria-pressed={dark}
      onClick={toggleTheme}
      className="inline-flex h-11 min-h-11 w-11 min-w-11 items-center justify-center rounded-lg border border-border/70 bg-surface/70 text-muted hover:border-accent/40 hover:text-accent"
    >
      <Icon name={dark ? 'sun' : 'moon'} width="1.125em" height="1.125em" />
      <span className="sr-only">{content.common.themeDark}</span>
    </button>
  )
}
