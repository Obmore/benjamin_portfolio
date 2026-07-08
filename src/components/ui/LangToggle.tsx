import { useI18n } from '@/context/I18nContext'

export function LangToggle() {
  const { locale, toggleLocale } = useI18n()

  return (
    <button
      type="button"
      onClick={toggleLocale}
      aria-label={locale === 'hu' ? 'Switch to English' : 'Váltás magyarra'}
      className="rounded-lg border border-border/70 bg-surface/70 px-3 py-1.5 font-mono text-xs text-muted transition-colors hover:border-accent/40 hover:text-accent"
    >
      {locale === 'hu' ? 'EN' : 'HU'}
    </button>
  )
}
