export function GridBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-accent/5" />
      <div
        className="absolute inset-0 opacity-[0.35] dark:opacity-[0.15]"
        style={{
          backgroundImage: `
            linear-gradient(to right, color-mix(in srgb, var(--color-accent) 8%, transparent) 1px, transparent 1px),
            linear-gradient(to bottom, color-mix(in srgb, var(--color-accent) 8%, transparent) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />
      <div className="absolute -right-32 top-20 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
      <div className="absolute -left-24 bottom-20 h-80 w-80 rounded-full bg-cyan/10 blur-3xl" />
    </div>
  )
}
