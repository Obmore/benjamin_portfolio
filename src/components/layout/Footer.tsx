import { useI18n } from '@/context/useI18n'
import { OrderLink } from '@/components/ui/OrderLink'

export function Footer() {
  const { content } = useI18n()
  const link = 'underline text-foreground hover:text-accent'

  return (
    <footer className="border-t border-border/60 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-5 text-center text-sm text-muted md:px-8">
        <p>{content.footer.text}</p>
        <OrderLink className={link} />
        <nav aria-label={content.common.navLegal} className="flex flex-wrap justify-center gap-x-5 gap-y-2">
          <a href={content.footer.imprintHref} className={link}>{content.footer.imprint}</a>
          <a href="/aszf/" className={link}>{content.footer.terms}</a>
          <a href="/adatkezeles/" className={link}>{content.footer.privacy}</a>
        </nav>
      </div>
    </footer>
  )
}
