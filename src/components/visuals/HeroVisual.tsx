import { motion } from 'framer-motion'

const nodes = [
  { cx: 120, cy: 80, delay: 0 },
  { cx: 280, cy: 160, delay: 0.2 },
  { cx: 420, cy: 100, delay: 0.4 },
  { cx: 560, cy: 200, delay: 0.6 },
  { cx: 200, cy: 280, delay: 0.3 },
  { cx: 380, cy: 320, delay: 0.5 },
  { cx: 520, cy: 360, delay: 0.7 },
]

export function HeroVisual() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-lg">
      <div className="absolute inset-8 rounded-full bg-gradient-to-br from-accent/20 via-cyan/10 to-transparent blur-2xl" />
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="relative h-full w-full rounded-3xl border border-border/60 bg-surface/40 p-6 backdrop-blur-md"
      >
        <svg viewBox="0 0 640 420" className="h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id="heroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.8" />
              <stop offset="100%" stopColor="var(--color-cyan)" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          <motion.path
            d="M120 80 L280 160 L420 100 L560 200"
            fill="none"
            stroke="url(#heroGrad)"
            strokeWidth="1.5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, ease: 'easeInOut' }}
          />
          <motion.path
            d="M120 80 L200 280 L380 320 L560 200"
            fill="none"
            stroke="url(#heroGrad)"
            strokeWidth="1"
            strokeDasharray="4 6"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2.4, delay: 0.3, ease: 'easeInOut' }}
          />
          <motion.path
            d="M280 160 L380 320"
            fill="none"
            stroke="var(--color-cyan)"
            strokeWidth="1"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.8, delay: 0.6, ease: 'easeInOut' }}
          />

          {nodes.map((node) => (
            <motion.g key={`${node.cx}-${node.cy}`}>
              <motion.circle
                cx={node.cx}
                cy={node.cy}
                r="6"
                fill="var(--color-surface)"
                stroke="url(#heroGrad)"
                strokeWidth="2"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: node.delay + 0.8, duration: 0.4 }}
              />
              <motion.circle
                cx={node.cx}
                cy={node.cy}
                r="12"
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth="1"
                opacity="0.4"
                animate={{ r: [12, 18, 12], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 3, repeat: Infinity, delay: node.delay }}
              />
            </motion.g>
          ))}

          <motion.rect
            x="460"
            y="40"
            width="140"
            height="80"
            rx="8"
            fill="var(--color-surface)"
            fillOpacity="0.5"
            stroke="var(--color-border)"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.6 }}
          />
          <motion.text
            x="480"
            y="68"
            fill="var(--color-muted)"
            fontSize="11"
            fontFamily="monospace"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
          >
            systems.connect()
          </motion.text>
          <motion.text
            x="480"
            y="92"
            fill="var(--color-accent)"
            fontSize="11"
            fontFamily="monospace"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6 }}
          >
            status: integrated
          </motion.text>
        </svg>
      </motion.div>
    </div>
  )
}
