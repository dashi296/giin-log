export type { Councilor } from "@giin-log/db"

export interface CouncilorListItem {
  id: number
  slug: string
  name: string
  nameKana: string | null
  photoUrl: string | null
  faction: string | null
  generalQuestionCount: number
  honkaigiAttendanceRate: number | null
  sourceUrl: string
  updatedAt: string
}
