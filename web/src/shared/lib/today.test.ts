import { describe, it, expect } from "vitest"
import { todayIso } from "./today.js"

describe("todayIso", () => {
  it("converts UTC time to Asia/Tokyo date (next day case)", () => {
    // 2026-06-24T20:00:00Z = 2026-06-25T05:00:00+09:00
    expect(todayIso(new Date("2026-06-24T20:00:00Z"))).toBe("2026-06-25")
  })

  it("converts UTC time to Asia/Tokyo date (same day case)", () => {
    // 2026-06-25T03:00:00Z = 2026-06-25T12:00:00+09:00
    expect(todayIso(new Date("2026-06-25T03:00:00Z"))).toBe("2026-06-25")
  })
})
