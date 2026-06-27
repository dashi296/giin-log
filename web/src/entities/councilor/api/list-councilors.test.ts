// @vitest-environment node
import { describe, it, expect } from "vitest"
import { makeWebTestDb } from "@/shared/db/testing"
import { listCouncilors } from "./list-councilors.js"

describe("listCouncilors", () => {
  it("returns councilors of the term joined with faction and stats, ordered by kana", async () => {
    const { db, sqlite } = makeWebTestDb()
    const rows = await listCouncilors(db, 1)
    expect(rows.map((r) => r.slug)).toEqual(["sato-hanako", "yamada-taro"]) // さとう < やまだ
    const sato = rows[0]
    expect(sato.name).toBe("佐藤花子")
    expect(sato.faction).toBe("サンプル会派B")
    expect(sato.generalQuestionCount).toBe(1)
    expect(sato.honkaigiAttendanceRate).toBeCloseTo(0.5, 5)
    const yamada = rows[1]
    expect(yamada.honkaigiAttendanceRate).toBeCloseTo(1.0, 5)
    expect(typeof yamada.sourceUrl).toBe("string")
    sqlite.close()
  })

  it("returns an empty array for a term with no memberships", async () => {
    const { db, sqlite } = makeWebTestDb()
    const rows = await listCouncilors(db, 999)
    expect(rows).toEqual([])
    sqlite.close()
  })
})
