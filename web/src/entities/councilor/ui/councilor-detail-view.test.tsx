import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { CouncilorDetailView } from "./councilor-detail-view.js"
import type { CouncilorDetail } from "../api/get-councilor-detail.js"

const detail: CouncilorDetail = {
  councilor: {
    id: 1,
    slug: "yamada-taro",
    name: "山田太郎",
    nameKana: "やまだたろう",
    photoUrl: null,
    sourceUrl: "https://example.com/meibo",
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: "2026-06-20T00:00:00Z",
  },
  membership: {
    id: 1,
    councilorId: 1,
    termId: 1,
    faction: "サンプル会派A",
    electionCount: 2,
    area: "中央",
    phone: null,
    committees: '["総務常任委員会"]',
    roles: "[]",
    sourceUrl: "https://example.com/meibo",
    updatedAt: "2026-06-20T00:00:00Z",
  },
  stats: {
    generalQuestionCount: 1,
    statementCount: 1,
    honkaigiAttendanceRate: 1,
  },
  timeline: [
    {
      statement: {
        id: 1,
        meetingId: 1,
        councilorId: 1,
        kind: "general_question",
        sequence: 1,
        title: "子育て支援の拡充について",
        body: "本文",
        bodyTokenized: "本文",
        topics: '["子育て"]',
        sourceUrl: "https://example.com/s1",
        updatedAt: "2026-06-20T00:00:00Z",
      },
      meeting: {
        id: 1,
        name: "令和8年6月通常会議 第1日",
        heldOn: "2026-06-10",
        kind: "本会議",
        sourceUrl: "https://example.com/m1",
      },
    },
  ],
}

describe("CouncilorDetailView", () => {
  it("renders profile, stats and timeline", () => {
    render(<CouncilorDetailView detail={detail} />)
    expect(
      screen.getByRole("heading", { name: "山田太郎" }),
    ).toBeInTheDocument()
    expect(screen.getByText("サンプル会派A")).toBeInTheDocument()
    expect(screen.getByText("子育て支援の拡充について")).toBeInTheDocument()
    expect(screen.getByText(/2026-06-10/)).toBeInTheDocument()
  })
})
