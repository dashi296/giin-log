import { eq, and, desc, asc } from "drizzle-orm"
import { schema } from "@giin-log/db"
import type { Councilor, Membership, Meeting, Statement } from "@giin-log/db"
import type { AppDb } from "@/shared/db/types"

export interface TimelineItem {
  statement: Statement
  meeting: Pick<Meeting, "id" | "name" | "heldOn" | "kind" | "sourceUrl">
}

export interface CouncilorDetail {
  councilor: Councilor
  membership: Membership | undefined
  stats: {
    generalQuestionCount: number
    statementCount: number
    honkaigiAttendanceRate: number | null
  } | undefined
  timeline: TimelineItem[]
}

export async function getCouncilorDetail(
  db: AppDb,
  slug: string,
  termId: number,
): Promise<CouncilorDetail | undefined> {
  const councilorRows = await db
    .select()
    .from(schema.councilors)
    .where(eq(schema.councilors.slug, slug))
    .limit(1)
    .all()
  const councilor = councilorRows[0]
  if (!councilor) return undefined

  const membershipRows = await db
    .select()
    .from(schema.memberships)
    .where(
      and(
        eq(schema.memberships.councilorId, councilor.id),
        eq(schema.memberships.termId, termId),
      ),
    )
    .limit(1)
    .all()

  // 一覧は現任期の memberships に絞っている。詳細も同じスコープに合わせ、
  // 現任期に所属しない議員(過去任期のみ残る slug 等)はスコープ外として
  // undefined を返す(ルートでは 404)。
  const membership = membershipRows[0]
  if (!membership) return undefined

  const statsRows = await db
    .select({
      generalQuestionCount: schema.councilorStats.generalQuestionCount,
      statementCount: schema.councilorStats.statementCount,
      honkaigiAttendanceRate: schema.councilorStats.honkaigiAttendanceRate,
    })
    .from(schema.councilorStats)
    .where(
      and(
        eq(schema.councilorStats.councilorId, councilor.id),
        eq(schema.councilorStats.termId, termId),
      ),
    )
    .limit(1)
    .all()

  const timelineRows = await db
    .select({
      statement: schema.statements,
      meeting: {
        id: schema.meetings.id,
        name: schema.meetings.name,
        heldOn: schema.meetings.heldOn,
        kind: schema.meetings.kind,
        sourceUrl: schema.meetings.sourceUrl,
      },
    })
    .from(schema.statements)
    .innerJoin(
      schema.meetings,
      eq(schema.meetings.id, schema.statements.meetingId),
    )
    .where(
      and(
        eq(schema.statements.councilorId, councilor.id),
        eq(schema.meetings.termId, termId),
      ),
    )
    .orderBy(desc(schema.meetings.heldOn), asc(schema.statements.sequence))
    .all()

  return {
    councilor,
    membership,
    stats: statsRows[0],
    timeline: timelineRows,
  }
}
