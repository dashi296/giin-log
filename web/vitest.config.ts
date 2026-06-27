import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    server: {
      // react-remove-scroll/tslib: radix-ui needs tslib at runtime under jsdom
      deps: { inline: ["@giin-log/db", "react-remove-scroll", "tslib"] },
    },
  },
})
