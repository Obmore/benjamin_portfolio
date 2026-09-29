import { useI18n } from '@/context/I18nContext'

export function Footer() {
  const { content } = useI18n()

  return (
    <footer className="border-t border-border/60 py-8">
      <div className="mx-auto max-w-6xl px-5 text-center text-sm text-muted md:px-8">
        {content.footer.text}
      </div>
    </footer>
  )
}
