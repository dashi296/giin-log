import { drizzle } from "drizzle-orm/d1"
import { env } from "cloudflare:workers"
import { schema } from "@giin-log/db"
import type { AppDb } from "./types.js"

// routes の loader 専用。env.DB はリクエスト内でのみ有効なので関数で生成する。
export function getDb(): AppDb {
  return drizzle(env.DB, { schema }) as unknown as AppDb
}
