import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { Provenance } from "./provenance.js"

describe("Provenance", () => {
  it("renders a source link and last-updated date", () => {
    render(
      <Provenance
        sourceUrl="https://example.com/x"
        updatedAt="2026-06-20T00:00:00Z"
      />,
    )
    const link = screen.getByRole("link", { name: /出典/ })
    expect(link).toHaveAttribute("href", "https://example.com/x")
    expect(screen.getByText(/2026-06-20/)).toBeInTheDocument()
  })
})
