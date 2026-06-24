# CLAUDE.md

このリポジトリで作業する Claude / 開発者向けのガイドです。

## プロジェクト概要

大津市(滋賀県)の市議会議員の活動を、市民が分かりやすく閲覧できる Web サイト(`giin-log`)。
議会の公開情報を自動収集し、議員ごとに発言・一般質問・出席状況を見える化する。

詳細な設計は [`docs/superpowers/specs/2026-06-24-otsu-giin-log-design.md`](docs/superpowers/specs/2026-06-24-otsu-giin-log-design.md) が正典(source of truth)。**設計に関わる判断はまずこのドキュメントを参照すること。**

## アーキテクチャ

3 コンポーネントを疎結合で構成する(収集が壊れても表示は落ちない)。

- `scraper/` — Node/TypeScript の収集スクリプト。GitHub Actions cron で定期実行。D1 HTTP API で書き込む。Valibot でパース結果を検証。
- `db/` — Drizzle ORM のスキーマ(単一情報源)+ マイグレーション + 推論された共有型。Cloudflare D1 (SQLite)。
- `web/` — TanStack Start アプリ。Cloudflare Workers にデプロイし、`env.DB` 経由で D1 を直接クエリ。**Feature-Sliced Design** で構成。

### DB(Drizzle ハイブリッド)

- スキーマは `db/src/schema.ts` の Drizzle 定義が単一情報源。行の型は `$inferSelect`/`$inferInsert` で導出し、**手書き型を作らない**。
- テーブル・列挙(enum + check)・型安全クエリ/upsert は Drizzle。**FTS5 仮想テーブル・同期トリガー・集計ビューは Drizzle で表現できない**ため、生 SQL のカスタムマイグレーション(`drizzle-kit generate --custom`)で補う。
- マイグレーションは drizzle-kit 生成。本番は wrangler 経由で D1 に適用、テストは `drizzle-orm/better-sqlite3` のマイグレータで同じマイグレーションを適用して検証(ネットワーク非依存)。
- **drizzle-kit 0.24 は schema の `check()` を生成 SQL に出力しない**ため、enum 列の CHECK 制約は生成後に手動で追記する必要がある(将来 drizzle-kit 上げで解消検討)。

### web(Feature-Sliced Design)

- レイヤー: `routes / app / widgets / features / entities / shared`。**pages レイヤーは置かない** — TanStack Router のファイルベースルーティング(`web/src/routes/`)が pages 相当の薄い合成層を担う。
- 依存ルール: 上位は下位のみ import 可(`routes → widgets → features → entities → shared`)。逆方向・同一レイヤー間の依存を作らない。
- `entities/*` の型は `@giin-log/db` の推論型を再 export して用いる。
- FSD は web のみに適用。db/scraper は通常のパッケージ構成。

### ツール

- lint: **oxlint**、format: **oxfmt**(oxfmt は新しめ。不安定時は一時的に prettier 退避可)。
- 検証: **Valibot**(Zod ではない)。
- CI: GitHub Actions で PR ごとに lint/typecheck/test。収集 cron とは別ワークフロー。

## 重要な制約・規約

これらは設計上の意思決定であり、安易に変えないこと。

- **任期非依存のデータモデル**: 「人(`councilors`)」と「任期ごとに変わる属性(`memberships`)」を分離する。現任期に決め打ちしない。日付・term を軸にする。
- **冪等な収集**: スクレイパは自然キーで upsert し、再実行しても重複しない。
- **サイレント失敗の禁止**: 必須フィールド欠落やパース結果 0 件は「成功」とせず、プロセスを失敗終了させて Actions を赤くする。部分失敗はソース単位で隔離する。
- **文字コード**: 会議録検索システム(ぎょうせい Discuss 系)は **Shift-JIS / CGI フォーム駆動**。iconv-lite でデコードする。
- **日本語全文検索**: 本文は収集時に **kuromoji.js で分かち書き**して `body_tokenized` に保存し、FTS5(`unicode61`)+ bm25 で検索する。
- **集計はビューで**: 一般質問回数・本会議出席率などはアプリで計算せず SQLite の VIEW(`councilor_stats`)で算出する。
- **出席率は本会議のみ**(委員会は議員ごとに分母が変わるため MVP では扱わない)。
- **透明性**: 全データに公式サイトへの出典リンク(`source_url`)と最終更新日を必ず持たせ、UI に表示する。一次情報へ辿れることが信頼性の要。
- **法務**: robots.txt と利用規約を尊重。リクエスト間隔を空け、User-Agent を明示する。秘匿情報(D1 API トークン等)はコミットしない。

## スコープ(MVP)

- 含む: 議員名簿、会議録の発言、一般質問の回数・テーマ、本会議出席率、全文検索。対象は現任期。
- 含まない(将来): 議案・議員別賛否(PDF パース、Phase 2 最有力)、政務活動費、政治信条の AI 推定、市民間の議論(SNS/コメント)、他自治体への横展開。

## コマンド

> 実装の進行に合わせて追記する。現状は設計フェーズ。

```sh
pnpm install
# テスト一括:      pnpm test
# lint / format:   pnpm lint / pnpm format
# 型チェック:      pnpm typecheck
# マイグレ生成:    pnpm --filter @giin-log/db db:generate
# web 開発:        pnpm --filter web dev
# スクレイプ実行:  pnpm --filter scraper start
# D1 マイグレート: pnpm --filter web exec wrangler d1 migrations apply <DB_NAME>
```

## 作業の進め方

- 機能追加・挙動変更の前に brainstorming で設計を固める(superpowers のワークフローに従う)。
- 実装前にテストを書く(scraper はフィクスチャ単体テスト、web は loader/コンポーネントテスト)。
- 完了を主張する前に検証コマンドを実行し、出力で裏を取る。
