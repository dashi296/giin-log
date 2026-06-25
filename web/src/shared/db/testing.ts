import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import { migrate } from "drizzle-orm/better-sqlite3/migrator"
import { MIGRATIONS_FOLDER, applySeed, schema } from "@giin-log/db"
import type { AppDb } from "./types.js"

export function makeWebTestDb(seed = true): {
  db: AppDb
  sqlite: Database.Database
} {
  const sqlite = new Database(":memory:")
  sqlite.pragma("foreign_keys = ON")
  const d = drizzle(sqlite, { schema })
  migrate(d, { migrationsFolder: MIGRATIONS_FOLDER })
  if (seed) applySeed(sqlite)
  return { db: d as unknown as AppDb, sqlite }
}
