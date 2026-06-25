// @vitest-environment node
import { describe, it, expect } from "vitest"
import { makeWebTestDb } from "./testing.js"
import { schema } from "@giin-log/db"

describe("makeWebTestDb", () => {
  it("applies migrations and seed (2 councilors)", async () => {
    const { db, sqlite } = makeWebTestDb()
    const rows = await db.select().from(schema.councilors).all()
    expect(rows.length).toBe(2)
    sqlite.close()
  })

  it("can skip seeding", async () => {
    const { db, sqlite } = makeWebTestDb(false)
    const rows = await db.select().from(schema.councilors).all()
    expect(rows.length).toBe(0)
    sqlite.close()
  })
})
