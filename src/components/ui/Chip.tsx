interface ChipProps {
  label: string
}

export function Chip({ label }: ChipProps) {
  return (
    <span className="inline-flex rounded-[6px] border border-line/25 bg-surface px-2.5 py-1 font-mono text-[13px] leading-none text-foreground">
      {label}
    </span>
  )
}
