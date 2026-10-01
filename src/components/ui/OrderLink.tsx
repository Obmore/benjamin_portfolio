import type { AnchorHTMLAttributes } from 'react'
import { useI18n } from '@/context/I18nContext'
import { ORDER_HREF } from '@/lib/constants'

type OrderLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>

export function OrderLink({ className = '', ...props }: OrderLinkProps) {
  const { content, locale } = useI18n()

  return (
    <a {...props} href={ORDER_HREF} lang={locale === 'hu' ? 'hu' : undefined} className={className}>
      {content.nav.order}
    </a>
  )
}
