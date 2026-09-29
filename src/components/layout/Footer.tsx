import { useI18n } from '@/context/I18nContext'
import { GITHUB_LABEL, GITHUB_URL } from '@/lib/constants'

export function Footer() {
  const { content } = useI18n()

  return (
    <footer className="border-t border-line/20 py-8">
      <div className="mx-auto max-w-6xl space-y-2 px-5 text-center text-sm text-muted md:px-8">
        <p className="font-mono text-[11px] tracking-wide text-line">{content.hero.sheetLabel}</p>
        <p>{content.footer.text}</p>
        <p>
          {content.footer.sourceLabel}{' '}
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-line hover:underline"
          >
            {GITHUB_LABEL}
          </a>
        </p>
      </div>
    </footer>
  )
}
