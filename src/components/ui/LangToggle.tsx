import { useI18n } from '@/context/I18nContext'

export function LangToggle() {
  const { locale, toggleLocale, content, localeLoading, localeError } = useI18n()
  const nextCode = locale === 'hu' ? 'EN' : 'HU'
  const srText = locale === 'hu' ? content.common.langToEn : content.common.langToHu

  return (
    <><button
      type="button"
      onClick={toggleLocale}
      aria-busy={localeLoading || undefined}
      className="inline-flex h-11 min-h-11 min-w-11 items-center justify-center rounded-lg border border-border/70 bg-surface/70 px-2 font-mono text-xs text-muted hover:border-accent/40 hover:text-accent"
    >
      {nextCode}
      <span className="sr-only">{srText}</span>
    </button>
    <span role="status" className="sr-only">{localeError ? 'Az angol szöveg nem tölthető be. A nyelvváltó újratölti az oldalt.' : ''}</span></>
  )
}
