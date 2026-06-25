import { createFileRoute } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { useState } from "react"
import { getDb } from "@/shared/db/get-db"
import { getCurrentTerm } from "@/entities/term/api/current-term"
import { listCouncilors } from "@/entities/councilor/api/list-councilors"
import type { CouncilorListItem } from "@/entities/councilor/model"
import { CouncilorCard } from "@/entities/councilor/ui/councilor-card"
import { CouncilorControls } from "@/features/councilor-controls/ui"
import {
  applyControls,
  factionsOf,
  type SortKey,
} from "@/features/councilor-controls/model"
import { todayIso } from "@/shared/lib/today"

type CouncilorsPayload = { items: CouncilorListItem[] }

const fetchCouncilors = createServerFn().handler(
  async (): Promise<CouncilorsPayload> => {
    const db = getDb()
    const term = await getCurrentTerm(db, todayIso())
    if (!term) return { items: [] }
    const items = await listCouncilors(db, term.id)
    return { items }
  },
)

export const Route = createFileRoute("/")({
  loader: async (): Promise<CouncilorsPayload> => fetchCouncilors(),
  component: CouncilorsPage,
})

function CouncilorsPage() {
  const { items } = Route.useLoaderData()
  const [faction, setFaction] = useState<string | null>(null)
  const [sort, setSort] = useState<SortKey>("kana")
  const shown = applyControls(items, { faction, sort })

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-3xl font-bold">大津市議会 議員一覧</h1>
      {items.length === 0 ? (
        <p className="text-neutral-500">現任期のデータがありません。</p>
      ) : (
        <>
          <CouncilorControls
            factions={factionsOf(items)}
            faction={faction}
            sort={sort}
            onFactionChange={setFaction}
            onSortChange={setSort}
          />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((item) => (
              <li key={item.id}>
                <CouncilorCard item={item} />
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  )
}
