import { useI18n } from '@/context/I18nContext'
import { OrderLink } from '@/components/ui/OrderLink'

export function Footer() {
  const { content, locale } = useI18n()

  return (
    <footer className="border-t border-border/60 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-5 text-center text-sm text-muted md:px-8">
        <p>{content.footer.text}</p>
        <OrderLink className="underline text-foreground hover:text-accent" />
        <a href="/adatkezeles/" className="underline text-foreground hover:text-accent">{locale === 'hu' ? 'Adatkezelési tájékoztató' : 'Privacy notice (Hungarian)'}</a>
      </div>
    </footer>
  )
}
