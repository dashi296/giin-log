import { describe, it, expect } from "vitest"
import { applyControls, factionsOf } from "./model.js"
import type { CouncilorListItem } from "@/entities/councilor/model"

const base: Omit<CouncilorListItem, "id" | "slug" | "name" | "nameKana" | "faction" | "generalQuestionCount" | "honkaigiAttendanceRate"> =
  {
    photoUrl: null,
    sourceUrl: "https://example.com",
    updatedAt: "2026-06-20T00:00:00Z",
  }
const items: CouncilorListItem[] = [
  {
    ...base,
    id: 1,
    slug: "a",
    name: "Aさん",
    nameKana: "あ",
    faction: "会派X",
    generalQuestionCount: 5,
    honkaigiAttendanceRate: 0.9,
  },
  {
    ...base,
    id: 2,
    slug: "b",
    name: "Bさん",
    nameKana: "い",
    faction: "会派Y",
    generalQuestionCount: 2,
    honkaigiAttendanceRate: 0.5,
  },
  {
    ...base,
    id: 3,
    slug: "c",
    name: "Cさん",
    nameKana: "う",
    faction: "会派X",
    generalQuestionCount: 8,
    honkaigiAttendanceRate: null,
  },
]

describe("factionsOf", () => {
  it("returns unique factions sorted", () => {
    expect(factionsOf(items)).toEqual(["会派X", "会派Y"])
  })
})

describe("applyControls", () => {
  it("filters by faction", () => {
    const r = applyControls(items, { faction: "会派X", sort: "kana" })
    expect(r.map((i) => i.slug)).toEqual(["a", "c"])
  })
  it("sorts by questions desc", () => {
    const r = applyControls(items, { faction: null, sort: "questions" })
    expect(r.map((i) => i.slug)).toEqual(["c", "a", "b"])
  })
  it("sorts by attendance desc with nulls last", () => {
    const r = applyControls(items, { faction: null, sort: "attendance" })
    expect(r.map((i) => i.slug)).toEqual(["a", "b", "c"])
  })
  it("sorts by kana asc", () => {
    const r = applyControls(items, { faction: null, sort: "kana" })
    expect(r.map((i) => i.slug)).toEqual(["a", "b", "c"])
  })
})
