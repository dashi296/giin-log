// @vitest-environment node
import { describe, it, expect } from "vitest"
import { makeWebTestDb } from "@/shared/db/testing"
import { getCouncilorDetail } from "./get-councilor-detail.js"

describe("getCouncilorDetail", () => {
  it("returns profile, membership, stats and timeline for a known slug", async () => {
    const { db, sqlite } = makeWebTestDb()
    const d = await getCouncilorDetail(db, "yamada-taro", 1)
    expect(d?.councilor.name).toBe("山田太郎")
    expect(d?.membership?.faction).toBe("サンプル会派A")
    expect(d?.stats?.generalQuestionCount).toBe(1)
    expect(d?.stats?.statementCount).toBe(1)
    expect(d?.stats?.honkaigiAttendanceRate).toBeCloseTo(1.0, 5)
    expect(d?.timeline.length).toBe(1)
    expect(d?.timeline[0].statement.title).toBe("子育て支援の拡充について")
    expect(d?.timeline[0].meeting.heldOn).toBe("2026-06-10")
    expect(typeof d?.timeline[0].statement.sourceUrl).toBe("string")
    sqlite.close()
  })

  it("returns undefined for an unknown slug", async () => {
    const { db, sqlite } = makeWebTestDb()
    const d = await getCouncilorDetail(db, "no-such-person", 1)
    expect(d).toBeUndefined()
    sqlite.close()
  })
})
