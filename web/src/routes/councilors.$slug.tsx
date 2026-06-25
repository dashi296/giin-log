import { createFileRoute, notFound, Link } from "@tanstack/react-router"
import { getDb } from "@/shared/db/get-db"
import { getCurrentTerm } from "@/entities/term/api/current-term"
import { getCouncilorDetail, type CouncilorDetail } from "@/entities/councilor/api/get-councilor-detail"
import { CouncilorDetailView } from "@/entities/councilor/ui/councilor-detail-view"
import { todayIso } from "@/shared/lib/today"

export const Route = createFileRoute("/councilors/$slug")({
  loader: async ({ params }): Promise<{ detail: CouncilorDetail }> => {
    const db = getDb()
    const term = await getCurrentTerm(db, todayIso())
    const detail = term
      ? await getCouncilorDetail(db, params.slug, term.id)
      : undefined
    if (!detail) throw notFound()
    return { detail }
  },
  component: CouncilorDetailPage,
  notFoundComponent: () => (
    <main className="mx-auto max-w-3xl p-6">
      <p className="text-neutral-500">議員が見つかりませんでした。</p>
      <Link to="/" className="underline">一覧へ戻る</Link>
    </main>
  ),
})

function CouncilorDetailPage() {
  const { detail } = Route.useLoaderData()
  return (
    <main className="mx-auto max-w-3xl p-6">
      <Link to="/" className="text-sm underline">← 議員一覧へ戻る</Link>
      <div className="mt-4">
        <CouncilorDetailView detail={detail} />
      </div>
    </main>
  )
}
