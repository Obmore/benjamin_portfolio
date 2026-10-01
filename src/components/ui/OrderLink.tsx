import { SHOW_ORDER_LINK, ORDER_HREF } from '@/lib/flags'
import { useI18n } from '@/context/I18nContext'

export function OrderLink({ className = '' }: { className?: string }) {
  const { content } = useI18n()

  if (!SHOW_ORDER_LINK) return null

  return (
    <a href={ORDER_HREF} className={className}>
      {content.common.orderLink}
    </a>
  )
}
