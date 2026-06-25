export function Provenance({
  sourceUrl,
  updatedAt,
}: {
  sourceUrl: string
  updatedAt: string
}) {
  const date = updatedAt.slice(0, 10)
  return (
    <p className="text-xs text-neutral-500">
      <a
        href={sourceUrl}
        target="_blank"
        rel="noreferrer"
        className="underline hover:text-neutral-700"
      >
        出典(公式サイト)
      </a>
      <span className="ml-2">最終更新: {date}</span>
    </p>
  )
}
