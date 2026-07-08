interface SectionHeadingProps {
  title: string
  subtitle?: string
}

export function SectionHeading({ title, subtitle }: SectionHeadingProps) {
  return (
    <div className="mb-12 max-w-2xl">
      <div className="mb-4 flex items-center gap-3">
        <span className="h-px w-10 bg-gradient-to-r from-accent to-cyan" />
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
          section
        </span>
      </div>
      <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
        {title}
      </h2>
      {subtitle ? <p className="mt-3 text-muted">{subtitle}</p> : null}
    </div>
  )
}
