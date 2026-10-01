import type { AnchorHTMLAttributes } from 'react'
import { useI18n } from '@/context/I18nContext'
import { ORDER_HREF } from '@/lib/flags'

type OrderLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'lang'>

export function OrderLink({ className = 'text-accent', ...props }: OrderLinkProps) {
  const { content } = useI18n()

  return (
    <a {...props} href={ORDER_HREF} lang="hu" className={className}>
      {content.common.orderLink}
    </a>
  )
}
