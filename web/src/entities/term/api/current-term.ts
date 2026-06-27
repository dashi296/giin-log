import { and, lte, or, gte, isNull, desc } from "drizzle-orm"
import { schema } from "@giin-log/db"
import type { Term } from "@giin-log/db"
import type { AppDb } from "@/shared/db/types"

export async function getCurrentTerm(
  db: AppDb,
  today: string,
): Promise<Term | undefined> {
  const rows = await db
    .select()
    .from(schema.terms)
    .where(
      and(
        lte(schema.terms.startsOn, today),
        or(isNull(schema.terms.endsOn), gte(schema.terms.endsOn, today)),
      ),
    )
    .orderBy(desc(schema.terms.startsOn))
    .limit(1)
    .all()
  return rows[0]
}
