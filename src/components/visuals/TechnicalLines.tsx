import { motion } from 'framer-motion'

export function TechnicalLines() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-20 dark:opacity-10"
      viewBox="0 0 800 600"
      preserveAspectRatio="xMidYMid slice"
    >
      <motion.path
        d="M0 120 H200 L280 200 H520 L600 120 H800"
        fill="none"
        stroke="url(#lineGrad)"
        strokeWidth="1"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 2.5, ease: 'easeInOut' }}
      />
      <motion.path
        d="M0 380 H160 L240 300 H420 L500 380 H800"
        fill="none"
        stroke="url(#lineGrad)"
        strokeWidth="1"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 2.8, delay: 0.3, ease: 'easeInOut' }}
      />
      <motion.circle
        cx="280"
        cy="200"
        r="4"
        fill="var(--color-cyan)"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <motion.circle
        cx="500"
        cy="380"
        r="4"
        fill="var(--color-accent)"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 3.5, repeat: Infinity, delay: 0.5 }}
      />
      <defs>
        <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0" />
          <stop offset="50%" stopColor="var(--color-accent)" />
          <stop offset="100%" stopColor="var(--color-cyan)" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  )
}
