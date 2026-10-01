import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'

const variantStyles = {
  primary:
    'bg-foreground text-white shadow-lg shadow-accent/20 hover:bg-foreground/90',
  outline:
    'border-[1.5px] border-accent bg-surface/60 text-foreground hover:bg-accent/5',
  ghost: 'text-foreground hover:bg-accent/10',
} as const

type ButtonVariant = keyof typeof variantStyles

type CommonProps = {
  variant?: ButtonVariant
  className?: string
  children?: ReactNode
  external?: boolean
}

type ButtonAsButton = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined
  }

type ButtonAsLink = CommonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string
  }

export type ButtonProps = ButtonAsButton | ButtonAsLink

export function Button({
  variant = 'primary',
  href,
  external,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const classes = `ui-pressable inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variantStyles[variant]} ${className}`

  if (href) {
    const linkProps = props as AnchorHTMLAttributes<HTMLAnchorElement>
    const isDownload = Boolean(linkProps.download)
    return (
      <a
        href={href}
        target={external && !isDownload ? '_blank' : undefined}
        rel={external && !isDownload ? 'noopener noreferrer' : undefined}
        className={classes}
        {...linkProps}
      >
        {children}
      </a>
    )
  }

  return (
    <button className={classes} {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  )
}
