import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { Button } from "@/shadcn/ui/button"

describe("shadcn smoke", () => {
  it("renders a button with its label", () => {
    render(<Button>送信</Button>)
    expect(screen.getByRole("button", { name: "送信" })).toBeInTheDocument()
  })
})
