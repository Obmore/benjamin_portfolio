import type { ButtonHTMLAttributes, ReactNode } from 'react'

const variantStyles = {
  primary: 'bg-cta text-white hover:bg-[#9a3412]',
  outline:
    'border border-line/40 bg-surface text-foreground hover:border-line hover:bg-line/5',
  ghost: 'text-foreground hover:bg-line/10',
} as const

type ButtonVariant = keyof typeof variantStyles

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  href?: string
  external?: boolean
  children: ReactNode
  'data-cta'?: string
}

export function Button({
  variant = 'primary',
  href,
  external,
  className = '',
  children,
  type = 'button',
  'data-cta': dataCta,
  ...props
}: ButtonProps) {
  const classes = `inline-flex min-h-12 items-center justify-center gap-2 rounded-[6px] px-5 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${variantStyles[variant]} ${className}`
  const motionStyle = {
    transitionDuration: 'var(--motion-short)',
    transitionTimingFunction: 'var(--motion-ease)',
    transitionProperty: 'background-color, border-color, color, opacity',
  }

  if (href) {
    return (
      <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className={classes}
        style={motionStyle}
        data-cta={dataCta}
      >
        {children}
      </a>
    )
  }

  return (
    <button type={type} className={classes} style={motionStyle} data-cta={dataCta} {...props}>
      {children}
    </button>
  )
}
