import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'

const variantStyles = {
  primary:
    'bg-accent text-white shadow-lg shadow-accent/20 hover:shadow-accent/35 hover:bg-accent/90',
  outline:
    'border border-accent/30 bg-surface/60 text-foreground hover:border-accent hover:bg-accent/5',
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
  const classes = `ui-pressable inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variantStyles[variant]} ${className}`

  if (href) {
    return (
      <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className={classes}
        {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}
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
