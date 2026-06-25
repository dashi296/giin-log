export function StatBadge({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <span className="inline-flex flex-col rounded-md border border-neutral-200 px-3 py-1">
      <span className="text-xs text-neutral-500">{label}</span>
      <span className="text-lg font-semibold tabular-nums">{value}</span>
    </span>
  )
}
