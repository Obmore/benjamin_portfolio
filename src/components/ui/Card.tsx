import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface CardProps {
  children: ReactNode
  className?: string
  delay?: number
  padded?: boolean
}

export function Card({ children, className = '', delay = 0, padded = true }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`rounded-2xl border border-border/70 bg-surface/70 shadow-sm backdrop-blur-md ${
        padded ? 'p-6' : ''
      } ${className}`}
    >
      {children}
    </motion.div>
  )
}
