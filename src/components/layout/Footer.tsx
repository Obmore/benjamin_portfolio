import { useI18n } from '@/context/I18nContext'
import { ORDER_HREF, SHOW_ORDER_LINK } from '@/lib/constants'

export function Footer() {
  const { content } = useI18n()

  return (
    <footer className="border-t border-border/60 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-5 text-center text-sm text-muted md:px-8">
        <p>{content.footer.text}</p>
        {SHOW_ORDER_LINK ? (
          <a
            href={ORDER_HREF}
            hrefLang="hu"
            className="text-foreground transition-colors hover:text-accent"
          >
            {content.nav.order}
          </a>
        ) : null}
      </div>
    </footer>
  )
}
