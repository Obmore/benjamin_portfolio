import { useI18n } from '@/context/I18nContext'

export function LangToggle() {
  const { locale, toggleLocale, content, localeLoading } = useI18n()
  const nextCode = locale === 'hu' ? 'EN' : 'HU'
  const srText = locale === 'hu' ? content.common.langToEn : content.common.langToHu

  return (
    <button
      type="button"
      onClick={toggleLocale}
      aria-busy={localeLoading || undefined}
      className="rounded-lg border border-border/70 bg-surface/70 px-3 py-1.5 font-mono text-xs text-muted transition-colors hover:border-accent/40 hover:text-accent"
    >
      {nextCode}
      <span className="sr-only">{srText}</span>
    </button>
  )
}
