# web (Plan 2) 設計ドキュメント — 議員一覧・議員詳細

> giin-log の表示層(web パッケージ)の最初の実装計画(Plan 2)の設計。正典は [`2026-06-24-otsu-giin-log-design.md`](2026-06-24-otsu-giin-log-design.md)。本書はそれを実装レベルに具体化したサブ設計であり、矛盾する場合は正典が優先する。

## 1. 目的とスコープ

Plan 1(基盤/DB)で `@giin-log/db`(Drizzle スキーマ・FTS5・集計ビュー・推論型・シード)が揃った。Plan 2 は web パッケージを立ち上げ、**縦切り2画面**を最短で「本番配線」まで通す。

### 含む(Plan 2)

- **議員一覧**(`/`): 議員カード(写真・氏名・会派・一般質問回数・本会議出席率)。会派フィルタ・並べ替え。
- **議員詳細**(`/councilors/$slug`): プロフィール + 活動タイムライン(発言の時系列)+ 統計(一般質問回数・本会議出席率)+ 関心テーマ(`topics` タグ)。
- 全画面に**出典リンク(`source_url`)+ 最終更新日**を表示(透明性要件)。
- TanStack Start アプリ + Feature-Sliced Design + D1 binding 配線 + loader/コンポーネントテスト。
- `wrangler` ローカル D1(マイグレーション + シード適用)での実起動確認。

### 含まない(後続計画)

- **発言検索**(FTS5 + bm25): 別計画。D1 ローカル検証が重いため分離。
- **会議一覧**: 別計画。
- 本番 D1 作成・Cloudflare Workers へのクラウドデプロイ(資格情報が揃ってから別タスク)。

## 2. アーキテクチャ(Feature-Sliced Design)

正典の FSD 方針(pages レイヤーを置かず、TanStack Router のファイルベースルーティングが薄い合成層を担う)に従う。**shadcn は FSD レイヤーとは別の独立ディレクトリ**に置く。

```
web/src/
├── routes/        TanStack Router ファイルベースルーティング(各層を合成する薄い層)
│                  __root.tsx / index.tsx / councilors.$slug.tsx
├── app/           プロバイダ・ルートレイアウト・globals.css(Tailwind エントリ)
├── entities/      業務エンティティ: councilor / statement / meeting / term
│                  各 model(@giin-log/db 推論型の再export)+ ui + api(クエリ関数)
│                  ※ meeting は本スコープでは最小(model/型 + 詳細クエリでの join 用)
├── features/      ユーザー操作: faction-filter / sort-councilors
├── shared/        ui(プロジェクト固有の合成コンポーネント + shadcn の唯一の窓口)
│                  ・lib ・db ・config
└── shadcn/        shadcn 生成プリミティブ(button/card/badge/select/table/skeleton)
                   + lib/utils.ts(cn)  ※ components.json の alias 管理下
```

### 依存ルール(厳守)

```
routes → features → entities → shared → shadcn(vendored primitives)
```

- 上位は下位のみ import 可。逆方向・同一レイヤー間依存を作らない。
- **shadcn を import できるのは `shared/ui` だけ。** entities / features / routes は shadcn を直接 import しない。`shared/ui` が必要な shadcn プリミティブを再export/ラップし、加えてプロジェクト固有コンポーネント(議員カード・統計バッジ・出典リンク等)を提供する。これにより shadcn を将来差し替えても上位層に波及しない。
- shadcn ディレクトリは FSD 層に一切依存しない純プリミティブ。`components.json` の alias を `ui: "@/shadcn/ui"`、`utils: "@/shadcn/lib/utils"` に向け、shadcn CLI の追加先を shadcn ディレクトリに固定する。
- `entities/*` の型は `@giin-log/db` の推論型を再export して用いる(手書き型を作らない)。
- 可能なら oxlint の import 制限ルールで「shadcn を import できるのは shared のみ」を機械的に強制する(計画で検討)。

#### widgets レイヤーについて

正典の依存チェーンは `routes → widgets → features → entities → shared`。**Plan 2(2画面)では `widgets` レイヤーを使わない**ため上記ツリー・依存ルールから省略している。将来 widgets が必要になった場合は正典どおり `routes` と `features` の間(`routes → widgets → features`)に挿入する。省略は Plan 2 限定の判断であり、正典の FSD 方針を変更するものではない。

## 3. データアクセス

### ドライバ非依存のクエリ関数

クエリは `entities/*/api/*.ts` に集約し、**Drizzle インスタンスを引数で受け取る**ドライバ非依存関数にする。

- 引数の型は Drizzle の共通スーパータイプ(`BaseSQLiteDatabase<...>` 系)+ `@giin-log/db` の schema をジェネリクスに渡す。これにより `drizzle-orm/d1` と `drizzle-orm/better-sqlite3` の双方を同じ関数で扱える。
- 本番/dev: `shared/db` が `drizzle-orm/d1` で `env.DB`(D1 binding)から Drizzle を生成。
- テスト: `drizzle-orm/better-sqlite3` でメモリ DB を生成し、`@giin-log/db` の `MIGRATIONS_FOLDER` で同じマイグレーションを適用、`applySeed` でシード投入。
- **loader は薄く保つ**: env binding から Drizzle を取り、`entities/*/api` のクエリ関数を呼ぶだけ。ビジネスロジック・集計を loader に持たせない(集計は DB の `councilor_stats` ビュー)。

### env binding の取得

TanStack Start のサーバ実行コンテキスト(loader / server function)経由で Cloudflare の `env`(`env.DB`)にアクセスする。具体的な取得 API は実装計画で確定する(TanStack Start の Cloudflare 連携に依存)。

## 4. データ・クエリ詳細

### 現任期の選定

MVP は現任期が対象。現任期は**次の両条件を満たす `terms` のうち `starts_on` が最大**の term とする:

- `starts_on <= 現在日`(開始済み)
- `ends_on IS NULL OR ends_on >= 現在日`(未終了)

これにより、より新しい `starts_on` を持つが既に `ends_on < 現在日` で終了した任期を誤って拾わない。**該当する term が無い場合**(全任期が終了済み等)は、議員一覧は「現任期のデータがありません」の空状態を表示し(エラーにしない)、議員詳細は現任期 membership が無い旨を空状態で示す。任期非依存モデルは維持し、現任期は決め打ちせずクエリで選ぶ。

### 議員一覧クエリ

- `councilors ⋈ memberships(current term) ⋈ councilor_stats(councilor_id, term_id)`。
- カード表示項目: 写真・氏名・会派(`memberships.faction`)・一般質問回数(`general_question_count`)・本会議出席率(`honkaigi_attendance_rate`、NULL は「—」表示)。
- 並べ替えキー: 一般質問回数 / 本会議出席率 / 氏名かな。会派フィルタ: `memberships.faction`。
- フィルタ・並べ替えはクライアント操作(`features/`)。MVP は議員数が少ないため取得後にクライアントで処理してよい(クエリパラメータ化は将来検討)。

### 議員詳細クエリ

- `councilors(slug) + membership(current term) + councilor_stats + statements(councilor_id, 時系列降順) + 各 statement の meeting`。
- タイムライン: `statements` を `meetings.held_on` 降順で並べ、種別(一般質問/質疑/発言)・タイトル・テーマ(`topics`)・出典(`source_url`)を表示。
- 出席率・統計は `councilor_stats` から。関心テーマは `statements.topics`(JSON 文字列)を集約。

### 透明性表示(出典・更新日の粒度)

各画面に `source_url` への出典リンクと最終更新日(`updated_at`)を表示する。どの元データを出すかは要素ごとに次の方針とする:

- **プロフィール(議員一覧カード・詳細ヘッダ)**: 出典は `councilors`/`memberships` のうち利用可能なもの(MVP では市公式名簿)。更新日は `councilors.updated_at` と該当 `memberships`(列があれば)の最大値。
- **発言(タイムライン)**: 出典 = `statements.source_url`、更新日 = `statements.updated_at`。
- **出席**: `attendances` は `source_url` を持たないため `meetings.source_url` を継承(出典は会議)、更新日は `meetings.updated_at`(または attendances 側に updated_at があればその最大)。
- **統計(`councilor_stats`)**: ビューは派生値で更新日を持たないため、寄与する元データ(statements・attendances・meetings)の `updated_at` の最大値を「統計の最終更新日」として表示する。

具体カラムの有無は `@giin-log/db` のスキーマに従い、実装計画で最終確定する。

## 5. テスト(ネットワーク非依存)

- **クエリ関数テスト**: `entities/*/api` の各クエリ関数を、better-sqlite3 メモリ DB + 同マイグレーション(`@giin-log/db` の `MIGRATIONS_FOLDER`)+ `applySeed` でテスト(db パッケージと同じパターン)。現任期選定・並べ替え・出席率 NULL・タイムライン順序などの境界を検証。
- **コンポーネントテスト**: 主要コンポーネント(議員カード・統計バッジ・会派フィルタ・並べ替え・出典リンク)を Testing Library で検証。
- loader は薄いので、クエリ関数テスト + コンポーネントテストで実質カバーする。loader 自体の薄い結線は実起動確認で担保。
- ランナーは vitest(db と統一)。テストはネットワーク非依存。

## 6. スタイリング / UI

- **Tailwind CSS v4**(Vite プラグイン)+ **shadcn**(Radix ベース、copy-in)。
- 使う shadcn プリミティブは必要最小限(button・card・badge・select・table・skeleton 程度)。
- アクセシビリティ(キーボード操作・ARIA)を重視 — 公共・透明性サイトの要件。会派フィルタ・並べ替えの Select/Dropdown は shadcn のアクセシブルな実装を用いる。
- テンプレ然としない簡潔な見た目。具体のビジュアル詳細は実装段階で詰める。

## 7. デプロイ配線(クラウドは別タスク)

- `web/wrangler.toml`: D1 binding(`DB`)+ `migrations_dir = "../db/drizzle"`(db パッケージのマイグレーションを共有)。

### ローカル D1 への適用 + シード投入手順(実起動確認の前提)

better-sqlite3 テストは `applySeed` で完結するが、`wrangler` のローカル D1 は別経路で投入する。完了条件として以下の具体手順を踏む(コマンドは web パッケージ基準。実装計画で package.json スクリプト化する):

1. マイグレーション適用: `wrangler d1 migrations apply <DB_NAME> --local`(`migrations_dir = "../db/drizzle"` を参照)。
2. シード投入: `wrangler d1 execute <DB_NAME> --local --file ../db/seed/seed.sql`(db パッケージの `db/seed/seed.sql` を共有)。
3. 起動: `wrangler dev`(または vite dev)で議員一覧・詳細が**シード済みローカル D1 で動く**ことを確認。

シード SQL は FTS5 トリガー経由で `statements_fts` も同期される(本スコープでは検索画面は無いが、後続計画でそのまま使える)。

- 本番 D1 作成・Cloudflare Workers デプロイ・シークレット設定は、Cloudflare 資格情報が揃ってから別タスク。

## 8. CI

- 既存の `.github/workflows/ci.yml`(`lint → format:check → typecheck → test`)が web パッケージにも自動適用される(`pnpm -r` がモノレポ全体を回す)。web 追加に伴う CI 変更は原則不要。

## 9. 未確定事項(実装計画で確定する)

- TanStack Start の Cloudflare バインディング取得 API の正確な形(loader/server function 内での `env.DB` アクセス手段)。
- Tailwind v4 + shadcn + TanStack Start(Workers SSR)のバージョン整合と SSR/ハイドレーション挙動。
- ドライバ非依存クエリ関数の正確な型シグネチャ(`BaseSQLiteDatabase` のジェネリクス指定)。
- oxlint の import 制限ルールで FSD 依存方向 + 「shadcn は shared のみ」を強制できるか。

## 10. 完了後の状態

- web パッケージが立ち上がり、議員一覧・議員詳細の2画面がシード済みローカル D1 で動作する。
- クエリは entities の api 層に集約され、better-sqlite3 でネットワーク非依存にテストされる。
- UI は shared/ui を唯一の窓口として shadcn を利用し、FSD の依存方向が保たれる。
- wrangler.toml の配線が済み、クラウド資格情報が揃えば最小手順でデプロイできる。

## 次の計画

- **Plan 2.x (web 検索)**: 発言検索(FTS5 + bm25)を `features/statement-search` + `entities/statement/api` に追加。
- **Plan 2.y (web 会議)**: 会議一覧 + 登壇者一覧。
- **Plan 3 (scraper)**: HTML フィクスチャ取得 → パーサ TDD → kuromoji 分かち書き → Valibot 検証 → Drizzle `onConflictDoUpdate` で冪等 upsert(D1 HTTP API)→ GitHub Actions cron。
