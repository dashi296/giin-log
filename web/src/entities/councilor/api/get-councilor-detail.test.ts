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

  it("scopes the timeline to the given term", async () => {
    const { db, sqlite } = makeWebTestDb()
    sqlite.exec(`
      INSERT INTO terms (id, name, starts_on, ends_on, source_url)
        VALUES (2, '第2期', '2019-05-01', '2023-04-30', 'https://example.com/t2');
      INSERT INTO meetings (id, term_id, kind, name, held_on, source_url)
        VALUES (99, 2, '本会議', '前期 本会議', '2020-06-10', 'https://example.com/m99');
      INSERT INTO statements (meeting_id, councilor_id, kind, sequence, title, body, body_tokenized, source_url)
        VALUES (99, 1, 'general_question', 1, '前期の質問', '本文', '本文', 'https://example.com/s99');
    `)
    const d = await getCouncilorDetail(db, "yamada-taro", 1)
    expect(d?.timeline.length).toBe(1)
    expect(d?.timeline[0].statement.title).toBe("子育て支援の拡充について")
    sqlite.close()
  })
})
