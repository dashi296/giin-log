# Foundation (DB) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** giin-log の土台として pnpm モノレポを作り、Cloudflare D1 (SQLite) のスキーマを Drizzle で定義し、FTS5 全文検索・集計ビュー・共有型(推論)・シードデータ・lint/format・CI を、すべて自動テストで検証できる状態にする。

**Architecture:** `db/` パッケージで Drizzle により SQLite スキーマを単一情報源として定義する。テーブル定義・行の型・型安全クエリ/upsert は Drizzle、FTS5 仮想テーブル・同期トリガー・集計ビューは Drizzle が表現できないため生 SQL のカスタムマイグレーションで補う。マイグレーションは drizzle-kit が生成し、本番は Cloudflare D1(wrangler、web 計画で配線)、テストは Drizzle の better-sqlite3 マイグレータが同じマイグレーションを適用して検証する。

**Tech Stack:** pnpm workspace, TypeScript, Drizzle ORM / drizzle-kit, SQLite (Cloudflare D1 / better-sqlite3), FTS5 (unicode61 + bm25), vitest, oxlint, oxfmt, GitHub Actions

## Global Constraints

- 任期非依存: 「人(`councilors`)」と「任期ごとに変わる属性(`memberships`)」を分離する。現任期に決め打ちしない。
- 冪等な収集を後段で可能にするため、各テーブルに自然キーの UNIQUE 制約を持たせる(scraper は Drizzle の `onConflictDoUpdate` でこのキーに upsert する)。
- 透明性: `meetings`・`statements` に `source_url` を必須で持たせる。
- 全文検索: 本文は分かち書き済み文字列(`body_tokenized`)を保存し、FTS5(`tokenize='unicode61'`)+ bm25 で検索する。分かち書き処理(kuromoji)は scraper の責務で本計画には含めない(シードは手動で分かち書き済みの文字列を使う)。
- 集計はアプリで計算せず SQLite の VIEW(`councilor_stats`)で算出する。
- 出席率は本会議(`kind='本会議'`)のみを対象とする。
- 列挙値(`kind`/`status`)は Drizzle の enum で型を、`check` 制約で DB レベルの整合性を両方担保する。
- SQLite には配列・JSONB・DATE 型が無い。配列は JSON 文字列(`TEXT`)、日時は ISO 8601 文字列(`TEXT`)で保持する。
- パッケージは ESM(`"type": "module"`)。
- スキーマ定義は Drizzle が単一情報源。手書きの型定義ファイルは作らず、`$inferSelect` で導出する。

---

### Task 1: モノレポ基盤・db パッケージ・Drizzle スキーマ・初期マイグレーション

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `package.json`(ルート)
- Create: `tsconfig.base.json`
- Create: `.npmrc`
- Create: `db/package.json`
- Create: `db/tsconfig.json`
- Create: `db/vitest.config.ts`
- Create: `db/drizzle.config.ts`
- Create: `db/src/schema.ts`
- Create: `db/src/migrate.ts`
- Create: `db/test/helpers.ts`
- Generate: `db/drizzle/0000_*.sql`(drizzle-kit が生成)
- Test: `db/test/schema.test.ts`

**Interfaces:**
- Produces: Drizzle テーブル `councilors`, `terms`, `memberships`, `meetings`, `attendances`, `statements`(`db/src/schema.ts`)。`statements.id` 等はすべて `integer().primaryKey()`(rowid)。
- Produces: `MIGRATIONS_FOLDER: string`(`db/src/migrate.ts`) と `makeTestDb(): { db: BetterSQLite3Database<typeof schema>; sqlite: Database.Database }`(`db/test/helpers.ts`) — メモリ DB を作り全マイグレーションを適用する。

- [ ] **Step 1: Write the failing test**

`db/test/schema.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { makeTestDb } from './helpers.js';

describe('core schema', () => {
  it('creates all core tables', () => {
    const { sqlite } = makeTestDb();
    const names = (
      sqlite
        .prepare("SELECT name FROM sqlite_master WHERE type='table'")
        .all() as { name: string }[]
    ).map((r) => r.name);
    for (const t of [
      'councilors',
      'terms',
      'memberships',
      'meetings',
      'attendances',
      'statements',
    ]) {
      expect(names).toContain(t);
    }
  });

  it('enforces statements natural-key uniqueness', () => {
    const { sqlite } = makeTestDb();
    sqlite.exec(`
      INSERT INTO terms (id, name, starts_on) VALUES (1, '第1期', '2023-05-01');
      INSERT INTO councilors (id, slug, name) VALUES (1, 'taro', '山田太郎');
      INSERT INTO meetings (id, term_id, kind, name, held_on, source_url)
        VALUES (1, 1, '本会議', '6月定例会', '2026-06-10', 'https://example.com/m1');
      INSERT INTO statements (meeting_id, councilor_id, kind, sequence, title, body, body_tokenized, source_url)
        VALUES (1, 1, 'general_question', 1, 'A', '...', 'a', 'https://example.com/s1');
    `);
    const dup = () =>
      sqlite
        .prepare(
          `INSERT INTO statements (meeting_id, councilor_id, kind, sequence, title, body, body_tokenized, source_url)
           VALUES (1, 1, 'general_question', 1, 'B', '...', 'b', 'https://example.com/s2')`,
        )
        .run();
    expect(dup).toThrow(/UNIQUE/);
  });

  it('enforces the status check constraint', () => {
    const { sqlite } = makeTestDb();
    sqlite.exec(`
      INSERT INTO terms (id, name, starts_on) VALUES (1, '第1期', '2023-05-01');
      INSERT INTO councilors (id, slug, name) VALUES (1, 'taro', '山田太郎');
      INSERT INTO meetings (id, term_id, kind, name, held_on, source_url)
        VALUES (1, 1, '本会議', '6月定例会', '2026-06-10', 'https://example.com/m1');
    `);
    const bad = () =>
      sqlite
        .prepare(
          `INSERT INTO attendances (meeting_id, councilor_id, status) VALUES (1, 1, 'maybe')`,
        )
        .run();
    expect(bad).toThrow(/CHECK/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @giin-log/db test`
Expected: FAIL（`Cannot find module './helpers.js'` など）

- [ ] **Step 3: Write workspace config, package config, schema, and helpers**

`pnpm-workspace.yaml`:

```yaml
packages:
  - 'db'
  - 'scraper'
  - 'web'
```

`package.json`(ルート):

```json
{
  "name": "giin-log",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "pnpm -r test",
    "lint": "oxlint",
    "format": "oxfmt",
    "format:check": "oxfmt --check",
    "typecheck": "pnpm -r typecheck"
  },
  "packageManager": "pnpm@9.7.0",
  "devDependencies": {
    "oxlint": "^0.9.0",
    "oxfmt": "^0.1.0"
  }
}
```

`tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "verbatimModuleSyntax": true,
    "noEmit": true
  }
}
```

`.npmrc`:

```
auto-install-peers=true
```

`db/package.json`:

```json
{
  "name": "@giin-log/db",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "db:generate": "drizzle-kit generate"
  },
  "dependencies": {
    "drizzle-orm": "^0.33.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.11",
    "better-sqlite3": "^11.3.0",
    "drizzle-kit": "^0.24.0",
    "typescript": "^5.6.2",
    "vitest": "^2.1.1"
  }
}
```

`db/tsconfig.json`:

```json
{
  "extends": "../tsconfig.base.json",
  "include": ["src", "test", "drizzle.config.ts"]
}
```

`db/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'node' },
});
```

`db/drizzle.config.ts`:

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/schema.ts',
  out: './drizzle',
});
```

`db/src/schema.ts`:

```ts
import { sql } from 'drizzle-orm';
import {
  sqliteTable,
  integer,
  text,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/sqlite-core';

export const councilors = sqliteTable('councilors', {
  id: integer('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  nameKana: text('name_kana'),
  photoUrl: text('photo_url'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%SZ','now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%SZ','now'))`),
});

export const terms = sqliteTable('terms', {
  id: integer('id').primaryKey(),
  name: text('name').notNull().unique(),
  startsOn: text('starts_on').notNull(),
  endsOn: text('ends_on'),
});

export const memberships = sqliteTable(
  'memberships',
  {
    id: integer('id').primaryKey(),
    councilorId: integer('councilor_id')
      .notNull()
      .references(() => councilors.id),
    termId: integer('term_id')
      .notNull()
      .references(() => terms.id),
    faction: text('faction'),
    electionCount: integer('election_count'),
    area: text('area'),
    phone: text('phone'),
    committees: text('committees'),
    roles: text('roles'),
  },
  (t) => ({
    uq: uniqueIndex('uq_memberships_councilor_term').on(t.councilorId, t.termId),
    termIdx: index('idx_memberships_term').on(t.termId),
  }),
);

export const meetings = sqliteTable(
  'meetings',
  {
    id: integer('id').primaryKey(),
    termId: integer('term_id')
      .notNull()
      .references(() => terms.id),
    kind: text('kind', { enum: ['本会議', '委員会'] }).notNull(),
    name: text('name').notNull(),
    heldOn: text('held_on').notNull(),
    sourceUrl: text('source_url').notNull(),
  },
  (t) => ({
    uq: uniqueIndex('uq_meetings_natural').on(
      t.termId,
      t.kind,
      t.name,
      t.heldOn,
    ),
    termIdx: index('idx_meetings_term').on(t.termId),
  }),
);

export const attendances = sqliteTable(
  'attendances',
  {
    id: integer('id').primaryKey(),
    meetingId: integer('meeting_id')
      .notNull()
      .references(() => meetings.id),
    councilorId: integer('councilor_id')
      .notNull()
      .references(() => councilors.id),
    status: text('status', { enum: ['present', 'absent'] }).notNull(),
  },
  (t) => ({
    uq: uniqueIndex('uq_attendances_meeting_councilor').on(
      t.meetingId,
      t.councilorId,
    ),
    meetingIdx: index('idx_attendances_meeting').on(t.meetingId),
    councilorIdx: index('idx_attendances_councilor').on(t.councilorId),
    statusChk: check(
      'attendances_status_check',
      sql`${t.status} IN ('present','absent')`,
    ),
  }),
);

export const statements = sqliteTable(
  'statements',
  {
    id: integer('id').primaryKey(),
    meetingId: integer('meeting_id')
      .notNull()
      .references(() => meetings.id),
    councilorId: integer('councilor_id')
      .notNull()
      .references(() => councilors.id),
    kind: text('kind', {
      enum: ['general_question', 'question', 'discussion', 'other'],
    }).notNull(),
    sequence: integer('sequence').notNull(),
    title: text('title'),
    body: text('body'),
    bodyTokenized: text('body_tokenized'),
    topics: text('topics'),
    sourceUrl: text('source_url').notNull(),
  },
  (t) => ({
    uq: uniqueIndex('uq_statements_natural').on(
      t.meetingId,
      t.councilorId,
      t.sequence,
    ),
    meetingIdx: index('idx_statements_meeting').on(t.meetingId),
    councilorIdx: index('idx_statements_councilor').on(t.councilorId),
    kindChk: check(
      'statements_kind_check',
      sql`${t.kind} IN ('general_question','question','discussion','other')`,
    ),
  }),
);
```

`db/src/migrate.ts`:

```ts
import { fileURLToPath } from 'node:url';

export const MIGRATIONS_FOLDER = fileURLToPath(
  new URL('../drizzle', import.meta.url),
);
```

`db/test/helpers.ts`:

```ts
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../src/schema.js';
import { MIGRATIONS_FOLDER } from '../src/migrate.js';

export function makeTestDb(): {
  db: BetterSQLite3Database<typeof schema>;
  sqlite: Database.Database;
} {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return { db, sqlite };
}
```

- [ ] **Step 4: Generate the initial migration**

Run: `pnpm install && pnpm --filter @giin-log/db db:generate`
Expected: `db/drizzle/0000_*.sql` と `db/drizzle/meta/_journal.json` が生成される(テーブル6つ・インデックス・check 制約を含む)。

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @giin-log/db test schema`
Expected: PASS（3 tests）

- [ ] **Step 6: Commit**

```bash
git add pnpm-workspace.yaml package.json tsconfig.base.json .npmrc db/
git commit -m "feat(db): モノレポ基盤とDrizzleスキーマ・初期マイグレーションを追加"
```

---

### Task 2: FTS5 全文検索テーブルと同期トリガー(カスタムマイグレーション)

**Files:**
- Generate+Edit: `db/drizzle/0001_*.sql`(`--custom` で生成し中身を記述)
- Test: `db/test/fts.test.ts`

**Interfaces:**
- Consumes: Task 1 の `statements` テーブル(`id` は rowid)と `makeTestDb()`。
- Produces: 外部コンテンツ FTS5 テーブル `statements_fts`(`title`, `body_tokenized`、`content='statements'`, `content_rowid='id'`)と INSERT/UPDATE/DELETE 同期トリガー3つ。検索は `statements_fts MATCH ?` + `bm25(statements_fts)`。

- [ ] **Step 1: Write the failing test**

`db/test/fts.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { makeTestDb } from './helpers.js';

function base(sqlite: Database.Database) {
  sqlite.exec(`
    INSERT INTO terms (id, name, starts_on) VALUES (1, '第1期', '2023-05-01');
    INSERT INTO councilors (id, slug, name) VALUES (1, 'taro', '山田太郎');
    INSERT INTO meetings (id, term_id, kind, name, held_on, source_url)
      VALUES (1, 1, '本会議', '6月定例会', '2026-06-10', 'https://example.com/m1');
  `);
}

function seedOne(sqlite: Database.Database, id: number, tokenized: string) {
  sqlite
    .prepare(
      `INSERT INTO statements (id, meeting_id, councilor_id, kind, sequence, title, body, body_tokenized, source_url)
       VALUES (?, 1, 1, 'general_question', ?, '質問', '本文', ?, 'https://example.com/s' || ?)`,
    )
    .run(id, id, tokenized, id);
}

describe('statements_fts', () => {
  it('finds a statement by tokenized keyword', () => {
    const { sqlite } = makeTestDb();
    base(sqlite);
    seedOne(sqlite, 1, '子育て 支援 について 質問');
    seedOne(sqlite, 2, '道路 整備 の 予算');
    const hits = (
      sqlite
        .prepare(
          `SELECT s.id FROM statements_fts f
           JOIN statements s ON s.id = f.rowid
           WHERE statements_fts MATCH ?
           ORDER BY bm25(statements_fts)`,
        )
        .all('子育て') as { id: number }[]
    ).map((h) => h.id);
    expect(hits).toEqual([1]);
  });

  it('keeps the index in sync after UPDATE and DELETE', () => {
    const { sqlite } = makeTestDb();
    base(sqlite);
    seedOne(sqlite, 1, '子育て 支援');
    sqlite
      .prepare(`UPDATE statements SET body_tokenized = ? WHERE id = 1`)
      .run('防災 計画');
    const count = (kw: string) =>
      (
        sqlite
          .prepare(
            `SELECT COUNT(*) AS c FROM statements_fts WHERE statements_fts MATCH ?`,
          )
          .get(kw) as { c: number }
      ).c;
    expect(count('子育て')).toBe(0);
    expect(count('防災')).toBe(1);
    sqlite.prepare(`DELETE FROM statements WHERE id = 1`).run();
    expect(count('防災')).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @giin-log/db test fts`
Expected: FAIL（`no such table: statements_fts`）

- [ ] **Step 3: Generate a custom migration and fill it**

Run: `pnpm --filter @giin-log/db exec drizzle-kit generate --custom --name fts`
Expected: 空の `db/drizzle/0001_*.sql` が生成され、`meta/_journal.json` に登録される。

生成された `db/drizzle/0001_*.sql` に以下を記述:

```sql
CREATE VIRTUAL TABLE statements_fts USING fts5(
  title,
  body_tokenized,
  content='statements',
  content_rowid='id',
  tokenize='unicode61'
);
--> statement-breakpoint
CREATE TRIGGER statements_ai AFTER INSERT ON statements BEGIN
  INSERT INTO statements_fts(rowid, title, body_tokenized)
    VALUES (new.id, new.title, new.body_tokenized);
END;
--> statement-breakpoint
CREATE TRIGGER statements_ad AFTER DELETE ON statements BEGIN
  INSERT INTO statements_fts(statements_fts, rowid, title, body_tokenized)
    VALUES ('delete', old.id, old.title, old.body_tokenized);
END;
--> statement-breakpoint
CREATE TRIGGER statements_au AFTER UPDATE ON statements BEGIN
  INSERT INTO statements_fts(statements_fts, rowid, title, body_tokenized)
    VALUES ('delete', old.id, old.title, old.body_tokenized);
  INSERT INTO statements_fts(rowid, title, body_tokenized)
    VALUES (new.id, new.title, new.body_tokenized);
END;
```

(`--> statement-breakpoint` は drizzle マイグレータが文を分割するための区切りコメント。)

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @giin-log/db test fts`
Expected: PASS（2 tests）

- [ ] **Step 5: Commit**

```bash
git add db/drizzle/ db/test/fts.test.ts
git commit -m "feat(db): FTS5全文検索テーブルと同期トリガーを追加"
```

---

### Task 3: 集計ビュー councilor_stats(カスタムマイグレーション + Drizzle ビュー)

**Files:**
- Generate+Edit: `db/drizzle/0002_*.sql`(`--custom`)
- Modify: `db/src/schema.ts`(`councilorStats` ビューを追記)
- Test: `db/test/stats.test.ts`

**Interfaces:**
- Consumes: Task 1 の `memberships`, `statements`, `meetings`, `attendances`。
- Produces: SQL ビュー `councilor_stats(councilor_id, term_id, general_question_count, statement_count, honkaigi_attendance_rate)`。`honkaigi_attendance_rate` は本会議のみ対象、出欠記録が無ければ NULL、それ以外は 0.0〜1.0 の REAL。
- Produces: 型安全読取用の Drizzle ビュー `councilorStats`(`.existing()` でマイグレーション生成対象外)。

- [ ] **Step 1: Write the failing test**

`db/test/stats.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { makeTestDb } from './helpers.js';

function setup(): Database.Database {
  const { sqlite } = makeTestDb();
  sqlite.exec(`
    INSERT INTO terms (id, name, starts_on) VALUES (1, '第1期', '2023-05-01');
    INSERT INTO councilors (id, slug, name) VALUES (1, 'taro', '山田太郎');
    INSERT INTO memberships (id, councilor_id, term_id) VALUES (1, 1, 1);

    INSERT INTO meetings (id, term_id, kind, name, held_on, source_url) VALUES
      (1, 1, '本会議', '6月定例会1', '2026-06-10', 'https://example.com/m1'),
      (2, 1, '本会議', '6月定例会2', '2026-06-11', 'https://example.com/m2'),
      (3, 1, '委員会', '総務委員会',  '2026-06-12', 'https://example.com/m3');

    INSERT INTO attendances (meeting_id, councilor_id, status) VALUES
      (1, 1, 'present'),
      (2, 1, 'absent'),
      (3, 1, 'present');

    INSERT INTO statements (meeting_id, councilor_id, kind, sequence, title, body_tokenized, source_url) VALUES
      (1, 1, 'general_question', 1, 'A', 'a', 'https://example.com/s1'),
      (2, 1, 'general_question', 1, 'B', 'b', 'https://example.com/s2'),
      (1, 1, 'question',         2, 'C', 'c', 'https://example.com/s3');
  `);
  return sqlite;
}

describe('councilor_stats', () => {
  it('counts general questions and all statements per term', () => {
    const sqlite = setup();
    const row = sqlite
      .prepare(
        `SELECT general_question_count, statement_count
         FROM councilor_stats WHERE councilor_id = 1 AND term_id = 1`,
      )
      .get() as { general_question_count: number; statement_count: number };
    expect(row.general_question_count).toBe(2);
    expect(row.statement_count).toBe(3);
  });

  it('computes honkaigi attendance rate over honkaigi meetings only', () => {
    const sqlite = setup();
    const row = sqlite
      .prepare(
        `SELECT honkaigi_attendance_rate AS r
         FROM councilor_stats WHERE councilor_id = 1 AND term_id = 1`,
      )
      .get() as { r: number };
    expect(row.r).toBeCloseTo(0.5, 5);
  });

  it('returns NULL attendance rate when there is no honkaigi attendance record', () => {
    const { sqlite } = makeTestDb();
    sqlite.exec(`
      INSERT INTO terms (id, name, starts_on) VALUES (1, '第1期', '2023-05-01');
      INSERT INTO councilors (id, slug, name) VALUES (1, 'taro', '山田太郎');
      INSERT INTO memberships (id, councilor_id, term_id) VALUES (1, 1, 1);
    `);
    const row = sqlite
      .prepare(
        `SELECT honkaigi_attendance_rate AS r
         FROM councilor_stats WHERE councilor_id = 1 AND term_id = 1`,
      )
      .get() as { r: number | null };
    expect(row.r).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @giin-log/db test stats`
Expected: FAIL（`no such table: councilor_stats`）

- [ ] **Step 3: Generate a custom migration and add the Drizzle view**

Run: `pnpm --filter @giin-log/db exec drizzle-kit generate --custom --name views`
Expected: 空の `db/drizzle/0002_*.sql` が生成される。

生成された `db/drizzle/0002_*.sql` に以下を記述:

```sql
CREATE VIEW councilor_stats AS
SELECT
  m.councilor_id AS councilor_id,
  m.term_id AS term_id,
  (
    SELECT COUNT(*) FROM statements st
    JOIN meetings mt ON mt.id = st.meeting_id
    WHERE st.councilor_id = m.councilor_id
      AND mt.term_id = m.term_id
      AND st.kind = 'general_question'
  ) AS general_question_count,
  (
    SELECT COUNT(*) FROM statements st
    JOIN meetings mt ON mt.id = st.meeting_id
    WHERE st.councilor_id = m.councilor_id
      AND mt.term_id = m.term_id
  ) AS statement_count,
  (
    SELECT CASE
      WHEN COUNT(a.id) = 0 THEN NULL
      ELSE CAST(SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS REAL)
           / COUNT(a.id)
    END
    FROM attendances a
    JOIN meetings mt ON mt.id = a.meeting_id
    WHERE a.councilor_id = m.councilor_id
      AND mt.term_id = m.term_id
      AND mt.kind = '本会議'
  ) AS honkaigi_attendance_rate
FROM memberships m;
```

`db/src/schema.ts` の末尾に型安全読取用のビューを追記(冒頭の import に `sqliteView`, `real` を追加):

```ts
import {
  sqliteTable,
  sqliteView,
  integer,
  real,
  text,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/sqlite-core';

// ...(既存のテーブル定義の後)

export const councilorStats = sqliteView('councilor_stats', {
  councilorId: integer('councilor_id').notNull(),
  termId: integer('term_id').notNull(),
  generalQuestionCount: integer('general_question_count').notNull(),
  statementCount: integer('statement_count').notNull(),
  honkaigiAttendanceRate: real('honkaigi_attendance_rate'),
}).existing();
```

- [ ] **Step 4: Run the test and typecheck to verify they pass**

Run: `pnpm --filter @giin-log/db test stats && pnpm --filter @giin-log/db typecheck`
Expected: PASS（3 tests、`tsc` エラー 0）

- [ ] **Step 5: Commit**

```bash
git add db/drizzle/ db/src/schema.ts db/test/stats.test.ts
git commit -m "feat(db): 集計ビューcouncilor_statsを追加"
```

---

### Task 4: 推論された共有型のエクスポート

**Files:**
- Create: `db/src/types.ts`
- Create: `db/src/index.ts`
- Test: `db/test/types.test.ts`

**Interfaces:**
- Produces: `Councilor`, `Term`, `Membership`, `Meeting`, `Attendance`, `Statement`, `CouncilorStats`(行の select 型)と `New*`(insert 型)、ユニオン型 `StatementKind`, `AttendanceStatus`, `MeetingKind`。すべて Drizzle スキーマからの推論。`db/src/index.ts` が schema・types・`MIGRATIONS_FOLDER` を再 export する。

- [ ] **Step 1: Write the failing test**

`db/test/types.test.ts`:

```ts
import { describe, it, expectTypeOf } from 'vitest';
import type {
  Councilor,
  Statement,
  StatementKind,
  MeetingKind,
  CouncilorStats,
} from '../src/index.js';

describe('shared types', () => {
  it('Statement.kind is the StatementKind union', () => {
    expectTypeOf<Statement['kind']>().toEqualTypeOf<StatementKind>();
  });

  it('MeetingKind is the literal union', () => {
    expectTypeOf<MeetingKind>().toEqualTypeOf<'本会議' | '委員会'>();
  });

  it('row objects are constructible', () => {
    const c: Councilor = {
      id: 1,
      slug: 'taro',
      name: '山田太郎',
      nameKana: null,
      photoUrl: null,
      createdAt: '2026-06-24T00:00:00Z',
      updatedAt: '2026-06-24T00:00:00Z',
    };
    expectTypeOf(c).toMatchTypeOf<Councilor>();
  });

  it('CouncilorStats attendance rate is nullable', () => {
    expectTypeOf<
      CouncilorStats['honkaigiAttendanceRate']
    >().toEqualTypeOf<number | null>();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @giin-log/db test types`
Expected: FAIL（`Cannot find module '../src/index.js'`）

- [ ] **Step 3: Write the inferred types and barrel export**

`db/src/types.ts`:

```ts
import type {
  councilors,
  terms,
  memberships,
  meetings,
  attendances,
  statements,
  councilorStats,
} from './schema.js';

export type Councilor = typeof councilors.$inferSelect;
export type NewCouncilor = typeof councilors.$inferInsert;
export type Term = typeof terms.$inferSelect;
export type NewTerm = typeof terms.$inferInsert;
export type Membership = typeof memberships.$inferSelect;
export type NewMembership = typeof memberships.$inferInsert;
export type Meeting = typeof meetings.$inferSelect;
export type NewMeeting = typeof meetings.$inferInsert;
export type Attendance = typeof attendances.$inferSelect;
export type NewAttendance = typeof attendances.$inferInsert;
export type Statement = typeof statements.$inferSelect;
export type NewStatement = typeof statements.$inferInsert;
export type CouncilorStats = typeof councilorStats.$inferSelect;

export type StatementKind = Statement['kind'];
export type AttendanceStatus = Attendance['status'];
export type MeetingKind = Meeting['kind'];
```

`db/src/index.ts`:

```ts
export * as schema from './schema.js';
export * from './types.js';
export { MIGRATIONS_FOLDER } from './migrate.js';
```

- [ ] **Step 4: Run the test and typecheck to verify they pass**

Run: `pnpm --filter @giin-log/db test types && pnpm --filter @giin-log/db typecheck`
Expected: PASS（4 tests、`tsc` エラー 0）

- [ ] **Step 5: Commit**

```bash
git add db/src/types.ts db/src/index.ts db/test/types.test.ts
git commit -m "feat(db): Drizzle推論による共有型を追加"
```

---

### Task 5: シードデータと適用ヘルパー

**Files:**
- Create: `db/seed/seed.sql`
- Create: `db/src/seed.ts`
- Modify: `db/src/index.ts`(seed を再 export)
- Test: `db/test/seed.test.ts`

**Interfaces:**
- Consumes: Task 1〜3 のスキーマ・ビュー・FTS と `makeTestDb()`。
- Produces: `applySeed(sqlite: Database.Database, file?: string): void` と `SEED_FILE: string`。シードは web 開発用に最低 2 名の議員・1 任期・本会議2件・分かち書き済み発言を含む。

- [ ] **Step 1: Write the failing test**

`db/test/seed.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { makeTestDb } from './helpers.js';
import { applySeed } from '../src/seed.js';

function setup() {
  const { sqlite } = makeTestDb();
  applySeed(sqlite);
  return sqlite;
}

describe('seed data', () => {
  it('inserts at least two councilors and one term', () => {
    const sqlite = setup();
    const c = (
      sqlite.prepare('SELECT COUNT(*) AS c FROM councilors').get() as {
        c: number;
      }
    ).c;
    const t = (
      sqlite.prepare('SELECT COUNT(*) AS c FROM terms').get() as { c: number }
    ).c;
    expect(c).toBeGreaterThanOrEqual(2);
    expect(t).toBeGreaterThanOrEqual(1);
  });

  it('seeded statements are full-text searchable', () => {
    const sqlite = setup();
    const hits = (
      sqlite
        .prepare(
          `SELECT COUNT(*) AS c FROM statements_fts WHERE statements_fts MATCH ?`,
        )
        .get('子育て') as { c: number }
    ).c;
    expect(hits).toBeGreaterThanOrEqual(1);
  });

  it('produces non-empty stats via the view', () => {
    const sqlite = setup();
    const row = sqlite
      .prepare(
        `SELECT general_question_count, honkaigi_attendance_rate
         FROM councilor_stats ORDER BY councilor_id LIMIT 1`,
      )
      .get() as {
      general_question_count: number;
      honkaigi_attendance_rate: number | null;
    };
    expect(row.general_question_count).toBeGreaterThanOrEqual(1);
    expect(row.honkaigi_attendance_rate).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @giin-log/db test seed`
Expected: FAIL（`Cannot find module '../src/seed.js'`）

- [ ] **Step 3: Write the seed SQL and helper**

`db/seed/seed.sql`:

```sql
INSERT INTO terms (id, name, starts_on, ends_on)
  VALUES (1, '大津市議会 第1期(サンプル)', '2023-05-01', '2027-04-30');

INSERT INTO councilors (id, slug, name, name_kana) VALUES
  (1, 'yamada-taro', '山田太郎', 'やまだたろう'),
  (2, 'sato-hanako', '佐藤花子', 'さとうはなこ');

INSERT INTO memberships (id, councilor_id, term_id, faction, election_count, area, committees, roles) VALUES
  (1, 1, 1, 'サンプル会派A', 2, '中央', '["総務常任委員会"]', '[]'),
  (2, 2, 1, 'サンプル会派B', 1, '北部', '["教育厚生常任委員会"]', '["副議長"]');

INSERT INTO meetings (id, term_id, kind, name, held_on, source_url) VALUES
  (1, 1, '本会議', '令和8年6月通常会議 第1日', '2026-06-10', 'https://www.city.otsu.lg.jp/gikai/nittei/index.html'),
  (2, 1, '本会議', '令和8年6月通常会議 第2日', '2026-06-11', 'https://www.city.otsu.lg.jp/gikai/nittei/index.html');

INSERT INTO attendances (meeting_id, councilor_id, status) VALUES
  (1, 1, 'present'),
  (2, 1, 'present'),
  (1, 2, 'present'),
  (2, 2, 'absent');

INSERT INTO statements (meeting_id, councilor_id, kind, sequence, title, body, body_tokenized, topics, source_url) VALUES
  (1, 1, 'general_question', 1, '子育て支援の拡充について',
   '本市の子育て支援策について質問します。',
   '本市 の 子育て 支援 策 について 質問 し ます',
   '["子育て","福祉"]',
   'https://www.kensakusystem.jp/otsu/index.html'),
  (2, 2, 'general_question', 1, '防災計画の見直しについて',
   '近年の災害を踏まえ防災計画の見直しを求めます。',
   '近年 の 災害 を 踏まえ 防災 計画 の 見直し を 求め ます',
   '["防災"]',
   'https://www.kensakusystem.jp/otsu/index.html');
```

`db/src/seed.ts`:

```ts
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type Database from 'better-sqlite3';

export const SEED_FILE = fileURLToPath(
  new URL('../seed/seed.sql', import.meta.url),
);

export function applySeed(
  sqlite: Database.Database,
  file: string = SEED_FILE,
): void {
  sqlite.exec(readFileSync(file, 'utf8'));
}
```

`db/src/index.ts` に追記:

```ts
export { applySeed, SEED_FILE } from './seed.js';
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @giin-log/db test seed`
Expected: PASS（3 tests）

- [ ] **Step 5: Commit**

```bash
git add db/seed/seed.sql db/src/seed.ts db/src/index.ts db/test/seed.test.ts
git commit -m "feat(db): シードデータと適用ヘルパーを追加"
```

---

### Task 6: oxlint + oxfmt のセットアップ

**Files:**
- Create: `.oxlintrc.json`
- Create: `.oxlintignore`

**Interfaces:**
- Produces: ルートの `pnpm lint` / `pnpm format:check` が通る状態。

> 補足: oxfmt は oxlint より新しいツールです。実行時に未成熟・破壊的変更があった場合は、一時的に `prettier` に置き換えてよい(その場合 `format`/`format:check` スクリプトの中身のみ差し替える)。

- [ ] **Step 1: Write the config**

`.oxlintrc.json`:

```json
{
  "$schema": "https://raw.githubusercontent.com/oxc-project/oxc/main/npm/oxlint/configuration_schema.json",
  "categories": {
    "correctness": "error",
    "suspicious": "warn"
  },
  "ignorePatterns": ["**/dist/**", "**/.output/**", "**/drizzle/**"]
}
```

`.oxlintignore`:

```
node_modules
dist
.output
db/drizzle
```

- [ ] **Step 2: Run lint and format check**

Run: `pnpm install && pnpm lint && pnpm format:check`
Expected: lint はエラー 0(警告は可)。`format:check` は差分なし、または整形が必要なら `pnpm format` を実行してから再確認。

- [ ] **Step 3: Commit**

```bash
git add .oxlintrc.json .oxlintignore package.json
git commit -m "chore: oxlintとoxfmtを導入"
```

---

### Task 7: CI ワークフロー(PR で lint + typecheck + test)

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: push / pull_request で `lint`・`typecheck`・`test` を実行する CI。収集 cron(Plan 3)とは別物。

- [ ] **Step 1: Write the workflow**

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
```

- [ ] **Step 2: Verify locally that all CI steps pass**

Run: `pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test`
Expected: すべて成功(test は db の全 15 件)。

- [ ] **Step 3: Commit and push**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: lint・typecheck・testを実行するワークフローを追加"
git push
```

- [ ] **Step 4: Confirm CI is green on GitHub**

Run: `gh run watch` または `gh run list --limit 1`
Expected: 最新ワークフローが success。

---

### Task 8: 全体検証

**Files:**
- なし(検証のみ)

- [ ] **Step 1: Run the full suite**

Run: `pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test`
Expected: lint エラー 0、`tsc` エラー 0、test PASS(schema 3 + fts 2 + stats 3 + types 4 + seed 3 = 15 tests)。

- [ ] **Step 2: Commit any fixups**

```bash
git add -A
git commit -m "test(db): 基盤の全チェック通過を確認" --allow-empty
git push
```

---

## 完了後の状態

- pnpm モノレポが立ち上がり、`db` パッケージに Drizzle スキーマ・FTS5・集計ビュー・推論型・シードが揃う。
- スキーマは Drizzle が単一情報源。行の型は `$inferSelect`/`$inferInsert` で導出され、手書き型の二重管理が無い。
- マイグレーションは drizzle-kit 生成 + FTS/ビューのカスタム SQL。テストは Drizzle の better-sqlite3 マイグレータで同じマイグレーションを適用して検証(ネットワーク非依存)。
- oxlint/oxfmt と CI が整備され、PR ごとに自動チェックが走る。
- 共有スキーマとシードにより、scraper 完成前でも web 開発に着手できる。

## 次の計画

- **Plan 2 (web)**: `web/wrangler.toml` に `migrations_dir = "../db/drizzle"` と D1 binding を設定し、`drizzle-orm/d1` で `db` パッケージのスキーマを共有。シード投入済み D1 に対し TanStack Start で議員一覧・議員詳細・発言検索・会議一覧を実装し Cloudflare Workers へデプロイ。
- **Plan 3 (scraper)**: 実 HTML フィクスチャを取得(recon)→ 名簿/日程/発言順位表/会議録パーサを TDD → kuromoji 分かち書き → **Valibot** でパース結果を検証(境界での明示的失敗)→ Drizzle の `onConflictDoUpdate` で自然キーに冪等 upsert(D1 HTTP API 経由)→ GitHub Actions cron。
</parameter>
</invoke>
