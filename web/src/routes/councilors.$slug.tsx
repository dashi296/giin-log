import { createFileRoute, notFound, Link } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import * as v from "valibot"
import { getDb } from "@/shared/db/get-db"
import { getCurrentTerm } from "@/entities/term/api/current-term"
import {
  getCouncilorDetail,
  type CouncilorDetail,
} from "@/entities/councilor/api/get-councilor-detail"
import { CouncilorDetailView } from "@/entities/councilor/ui/councilor-detail-view"
import { todayIso } from "@/shared/lib/today"

const SlugInput = v.object({ slug: v.string() })

const fetchCouncilorDetail = createServerFn()
  .validator((data: unknown) => v.parse(SlugInput, data))
  .handler(async ({ data }): Promise<CouncilorDetail | null> => {
    const db = getDb()
    const term = await getCurrentTerm(db, todayIso())
    const detail = term
      ? await getCouncilorDetail(db, data.slug, term.id)
      : undefined
    // undefined は server fn の戻り値として JSON シリアライズできないため null に変換
    return detail ?? null
  })

type DetailPayload = { detail: CouncilorDetail }

export const Route = createFileRoute("/councilors/$slug")({
  loader: async ({ params }): Promise<DetailPayload> => {
    const detail = await fetchCouncilorDetail({ data: { slug: params.slug } })
    if (!detail) throw notFound()
    return { detail }
  },
  component: CouncilorDetailPage,
  notFoundComponent: () => (
    <main className="mx-auto max-w-3xl p-6">
      <p className="text-neutral-500">議員が見つかりませんでした。</p>
      <Link to="/" className="underline">
        一覧へ戻る
      </Link>
    </main>
  ),
})

function CouncilorDetailPage() {
  const { detail } = Route.useLoaderData()
  return (
    <main className="mx-auto max-w-3xl p-6">
      <Link to="/" className="text-sm underline">
        ← 議員一覧へ戻る
      </Link>
      <div className="mt-4">
        <CouncilorDetailView detail={detail} />
      </div>
    </main>
  )
}
