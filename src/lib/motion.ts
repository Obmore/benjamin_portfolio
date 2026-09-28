/** Shared motion tokens. Keep CSS custom properties in index.css in sync. */
export const MOTION = {
  strokeWidth: 1.5,
  ink: '#1F5FAD',
  paper: '#FAFAF7',
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  durationMs: {
    short: 180,
    medium: 400,
    long: 1200,
  },
  heroTransformMs: 2500,
  lit: '#C2410C',
} as const
