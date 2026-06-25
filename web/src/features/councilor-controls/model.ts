import type { CouncilorListItem } from "@/entities/councilor/model"

export type SortKey = "kana" | "questions" | "attendance"

export function factionsOf(items: CouncilorListItem[]): string[] {
  const set = new Set<string>()
  for (const i of items) if (i.faction) set.add(i.faction)
  return [...set].sort((a, b) => a.localeCompare(b, "ja"))
}

type ApplyControlsOpts = {
  faction: string | null
  sort: SortKey
}

export function applyControls(
  items: CouncilorListItem[],
  opts: ApplyControlsOpts,
): CouncilorListItem[] {
  const filtered = opts.faction
    ? items.filter((i) => i.faction === opts.faction)
    : items.slice()

  const byKana = (a: CouncilorListItem, b: CouncilorListItem) =>
    (a.nameKana ?? "").localeCompare(b.nameKana ?? "", "ja")

  switch (opts.sort) {
    case "questions":
      return filtered.sort(
        (a, b) =>
          b.generalQuestionCount - a.generalQuestionCount || byKana(a, b),
      )
    case "attendance":
      return filtered.sort((a, b) => {
        const av = a.honkaigiAttendanceRate
        const bv = b.honkaigiAttendanceRate
        if (av === null && bv === null) return byKana(a, b)
        if (av === null) return 1
        if (bv === null) return -1
        return bv - av || byKana(a, b)
      })
    case "kana":
    default:
      return filtered.sort(byKana)
  }
}
