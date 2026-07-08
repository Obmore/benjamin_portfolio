import { motion } from 'framer-motion'

interface ChipProps {
  label: string
}

export function Chip({ label }: ChipProps) {
  return (
    <motion.span
      whileHover={{ y: -2, scale: 1.02 }}
      className="inline-flex rounded-full border border-border/80 bg-surface/80 px-3 py-1 font-mono text-xs text-muted backdrop-blur-sm transition-colors hover:border-accent/50 hover:text-accent"
    >
      {label}
    </motion.span>
  )
}
