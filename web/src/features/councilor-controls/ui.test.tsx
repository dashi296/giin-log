import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { CouncilorControls } from "./ui.js"

describe("CouncilorControls", () => {
  it("renders faction options and reflects current sort", () => {
    render(
      <CouncilorControls
        factions={["会派X", "会派Y"]}
        faction={null}
        sort="kana"
        onFactionChange={vi.fn()}
        onSortChange={vi.fn()}
      />,
    )
    expect(screen.getByText("会派で絞り込み")).toBeInTheDocument()
    expect(screen.getByText("並べ替え")).toBeInTheDocument()
  })
})
