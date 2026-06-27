import { render, screen, waitFor } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import {
  createRouter,
  createRootRoute,
  createRoute,
  RouterProvider,
} from "@tanstack/react-router"
import { CouncilorCard } from "./councilor-card.js"
import type { CouncilorListItem } from "../model/index.js"

const item: CouncilorListItem = {
  id: 1,
  slug: "yamada-taro",
  name: "山田太郎",
  nameKana: "やまだたろう",
  photoUrl: null,
  faction: "サンプル会派A",
  generalQuestionCount: 3,
  honkaigiAttendanceRate: 0.75,
  sourceUrl: "https://example.com/meibo",
  updatedAt: "2026-06-20T00:00:00Z",
}

async function renderWithRouter(ui: React.ReactNode) {
  const rootRoute = createRootRoute({ component: () => <>{ui}</> })
  const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/" })
  const councilorRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/councilors/$slug",
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, councilorRoute]),
  })
  render(<RouterProvider router={router} />)
  await router.load()
}

describe("CouncilorCard", () => {
  it("shows name, faction, question count and attendance rate", async () => {
    await renderWithRouter(<CouncilorCard item={item} />)
    await waitFor(() => {
      expect(screen.getByText("山田太郎")).toBeInTheDocument()
      expect(screen.getByText("サンプル会派A")).toBeInTheDocument()
      expect(screen.getByText(/3/)).toBeInTheDocument()
      expect(screen.getByText(/75%/)).toBeInTheDocument()
    })
  })

  it("renders a dash for null attendance rate", async () => {
    await renderWithRouter(
      <CouncilorCard item={{ ...item, honkaigiAttendanceRate: null }} />,
    )
    await waitFor(() => expect(screen.getByText("—")).toBeInTheDocument())
  })
})
