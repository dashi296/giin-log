import { eq, and, asc } from "drizzle-orm"
import { schema } from "@giin-log/db"
import type { AppDb } from "@/shared/db/types"
import type { CouncilorListItem } from "../model/index.js"

export async function listCouncilors(
  db: AppDb,
  termId: number,
): Promise<CouncilorListItem[]> {
  const rows = await db
    .select({
      id: schema.councilors.id,
      slug: schema.councilors.slug,
      name: schema.councilors.name,
      nameKana: schema.councilors.nameKana,
      photoUrl: schema.councilors.photoUrl,
      faction: schema.memberships.faction,
      generalQuestionCount: schema.councilorStats.generalQuestionCount,
      honkaigiAttendanceRate: schema.councilorStats.honkaigiAttendanceRate,
      sourceUrl: schema.councilors.sourceUrl,
      updatedAt: schema.councilors.updatedAt,
    })
    .from(schema.memberships)
    .innerJoin(
      schema.councilors,
      eq(schema.councilors.id, schema.memberships.councilorId),
    )
    .leftJoin(
      schema.councilorStats,
      and(
        eq(schema.councilorStats.councilorId, schema.memberships.councilorId),
        eq(schema.councilorStats.termId, schema.memberships.termId),
      ),
    )
    .where(eq(schema.memberships.termId, termId))
    .orderBy(asc(schema.councilors.nameKana))
    .all()

  return rows.map((r) => ({
    ...r,
    generalQuestionCount: r.generalQuestionCount ?? 0,
  }))
}
