import { useI18n } from '@/context/I18nContext'

export function LangToggle() {
  const { locale, toggleLocale, content } = useI18n()

  return (
    <button
      type="button"
      onClick={toggleLocale}
      aria-label={
        locale === 'hu' ? `EN: ${content.common.langToEn}` : `HU: ${content.common.langToHu}`
      }
      className="rounded-[6px] border border-line/30 bg-surface px-3 py-1.5 font-mono text-xs text-muted hover:border-line hover:text-foreground"
    >
      {locale === 'hu' ? 'EN' : 'HU'}
    </button>
  )
}
