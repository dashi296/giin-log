// @vitest-environment node

import { describe, it, expect } from "vitest"
import { makeWebTestDb } from "@/shared/db/testing"
import { getCurrentTerm } from "./current-term.js"

describe("getCurrentTerm", () => {
  it("returns the seeded current term for a date within it", async () => {
    const { db, sqlite } = makeWebTestDb()
    const t = await getCurrentTerm(db, "2026-06-25")
    expect(t?.id).toBe(1)
    sqlite.close()
  })

  it("ignores a newer term that has already ended", async () => {
    const { db, sqlite } = makeWebTestDb()
    // 第1期より後に始まり、既に終了した任期を追加
    sqlite.exec(
      `INSERT INTO terms (id, name, starts_on, ends_on, source_url)
       VALUES (2, '第0.5期(終了済)', '2024-01-01', '2024-12-31', 'https://example.com/t2')`,
    )
    const t = await getCurrentTerm(db, "2026-06-25")
    expect(t?.id).toBe(1)
    sqlite.close()
  })

  it("ignores a future term that has not started", async () => {
    const { db, sqlite } = makeWebTestDb()
    sqlite.exec(
      `INSERT INTO terms (id, name, starts_on, ends_on, source_url)
       VALUES (3, '次期(未開始)', '2027-05-01', NULL, 'https://example.com/t3')`,
    )
    const t = await getCurrentTerm(db, "2026-06-25")
    expect(t?.id).toBe(1)
    sqlite.close()
  })

  it("returns undefined when no term is current", async () => {
    const { db, sqlite } = makeWebTestDb()
    const t = await getCurrentTerm(db, "2030-01-01")
    expect(t).toBeUndefined()
    sqlite.close()
  })
})
