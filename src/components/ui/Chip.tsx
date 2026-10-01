interface ChipProps {
  label: string
}

export function Chip({ label }: ChipProps) {
  return (
    <span className="ui-chip inline-flex rounded-full border border-border/80 bg-surface/80 px-3 py-1 font-mono text-xs text-muted backdrop-blur-sm transition-colors hover:border-accent/50 hover:text-accent">
      {label}
    </span>
  )
}
