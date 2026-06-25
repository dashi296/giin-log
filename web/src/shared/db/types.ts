import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core"
import { schema } from "@giin-log/db"

// async を上位型にし、クエリ関数は常に await する。
// テストの better-sqlite3(sync)は AppDb にキャストして渡す(await は同期値を透過)。
export type AppDb = BaseSQLiteDatabase<"async", unknown, typeof schema>
