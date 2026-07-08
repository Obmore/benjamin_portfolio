import { motion, type HTMLMotionProps } from 'framer-motion'

const variantStyles = {
  primary:
    'bg-accent text-white shadow-lg shadow-accent/20 hover:shadow-accent/35 hover:bg-accent/90',
  outline:
    'border border-accent/30 bg-surface/60 text-foreground hover:border-accent hover:bg-accent/5',
  ghost: 'text-foreground hover:bg-accent/10',
} as const

type ButtonVariant = keyof typeof variantStyles

interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: ButtonVariant
  href?: string
  external?: boolean
}

export function Button({
  variant = 'primary',
  href,
  external,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const classes = `inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-colors ${variantStyles[variant]} ${className}`

  if (href) {
    return (
      <motion.a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className={classes}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {children}
      </motion.a>
    )
  }

  return (
    <motion.button
      className={classes}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      {...props}
    >
      {children}
    </motion.button>
  )
}
