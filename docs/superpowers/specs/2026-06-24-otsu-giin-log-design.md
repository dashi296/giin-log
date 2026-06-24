# 大津市議会 議員活動ログサイト 設計ドキュメント (MVP)

- 作成日: 2026-06-24
- ステータス: 設計承認済み / 実装計画待ち

## 1. 目的とビジョン

大津市(滋賀県)の市議会議員について、**それぞれがどのような活動を行っているのか**を、市民が分かりやすく閲覧できる Web サイトを作る。

オーナーの長期ビジョンは次の4要素:

1. 各議員がどのような活動をしているか
2. 各議員がどのような政治信条か
3. それによって大津市にどのような影響があった(ある)か
4. 議員をめぐって市民間でどのような議論が行われているか

データの取りやすさには大きな差があるため、**MVP は (1) 「活動の見える化」に集中**する。(2) は将来 AI 要約・タグ付けで、(3) は議案賛否との紐付けで、(4) は SNS・コメント等の外部ソースで段階的に拡張する(本ドキュメントのスコープ外)。

## 2. スコープ

### MVP に含める

- 議員名簿(現任期)の収集・表示
- 会議録の発言(本会議・委員会)の収集・表示・全文検索
- 一般質問の回数とテーマの集計・表示
- 本会議の出席率の集計・表示
- 各データの出典(公式サイト)リンクと最終更新日の明示

### MVP に含めない(将来拡張)

- 議案・議員別賛否(公開はされているが PDF のみで取得難。Phase 2 の最有力)
- 政務活動費・委員会の出欠率(スキャン PDF 中心で OCR が必要)
- 政治信条の AI 推定・可視化
- 市民間の議論(SNS 連携・コメント機能)
- 大津市以外の自治体への横展開

### 対象期間

- MVP は **現任期のみ**を収集・表示する。
- ただしデータモデルとスクレイパは **「期(term)・日付」を軸**にし、過去・未来の任期も格納・表示できる設計にする。

## 3. データソース調査結果

大津市議会の公開データと自動収集の難易度(調査で確認済み):

| 対象 | 公開元 | 形式 | 構造化 | 難易度 | MVP |
|---|---|---|---|---|---|
| 議員名簿(氏名・読み・会派・当選回数・委員会役職・写真・連絡先) | 市公式サイト(1ページHTML) | HTML | 中 | 易〜中 | ✅ |
| 会議録(本会議・委員会の発言) | 会議録検索システム(ぎょうせい Discuss 系) | HTML+PDF | 高(発言者・日付・会議名で分離) | 中 | ✅ |
| 一般質問の発言順位表(議員名・質問テーマ) | 市公式サイト(年度別) | HTML | 中 | 中 | ✅ |
| 会議日程 | 市公式サイト(年度別) | HTML | 中 | 中 | ✅ |
| 出席/欠席名簿 | 会議録の各会議冒頭 | HTML | 中 | 中 | ✅(本会議のみ) |
| 議案・議員別賛否 | 市公式サイト | PDF のみ | 低 | 難 | ⏳ Phase 2 |
| 政務活動費 | 市公式サイト | PDF(スキャン含む) | 低 | 難 | ❌ |

主要 URL:

- 議会トップ: `https://www.city.otsu.lg.jp/gikai/index.html`
- 議員名簿: `https://www.city.otsu.lg.jp/gikai/giin/1430447099023.html`
- 会議日程: `https://www.city.otsu.lg.jp/gikai/nittei/index.html`
- 一般質問 発言順位表: `https://www.city.otsu.lg.jp/gikai/nittei/shitsuginarabiniippanshitsumon/index.html`
- 会議録検索システム: `https://www.kensakusystem.jp/otsu/index.html`(ぎょうせい Discuss 系、**Shift-JIS / CGI フォーム駆動**)

法務/規約:

- `city.otsu.lg.jp` の robots.txt は `/gikai/` を許可(Disallow は `/shisei/rei/k/` のみ)。
- `kensakusystem.jp` には robots.txt が無い(明示的禁止は無いが利用規約は実装着手前に最終確認する)。
- 収集はリクエスト間隔を空け、User-Agent を明示し、出典を明記する良識的運用とする。

## 4. アーキテクチャ

3 コンポーネントを疎結合で構成する。収集が壊れてもサイトは落ちない。

```
[大津市サイト / 会議録検索システム]
        │ 収集
        ▼
  scraper (Node/TS)  ──GitHub Actions cron──▶  [Cloudflare D1 (SQLite)]
   cheerio / iconv-lite / kuromoji    D1 HTTP API で書込    │ ネイティブ binding
        │                                                  ▼
                                          web (TanStack Start) ─▶ Cloudflare Workers
                                              env.DB で直接クエリ (egress 無し)
```

技術選定:

- **DB: Cloudflare D1 (SQLite)** — サイトが Cloudflare Workers 上にあるためネイティブ binding で繋がり、追加費用ほぼゼロ〜$5/月。低トラフィックでも停止しない。
- **表示: TanStack Start + Cloudflare Workers** — Server Functions / loader から `env.DB` 経由で D1 を直接クエリ。
- **収集: Node/TypeScript** — cheerio(HTML パース)、iconv-lite(Shift-JIS デコード)、kuromoji.js(日本語分かち書き)。GitHub Actions の cron(例: 月1)で定期実行。手動実行も可能。
- **収集→DB: D1 HTTP API (REST)** — Cloudflare 外(Actions)から D1 へバッチ投入。リクエスト上限に合わせて分割。
- **ORM/マイグレーション: Drizzle ORM + drizzle-kit**。スキーマを TypeScript で単一定義し、行の型は `$inferSelect`/`$inferInsert` で導出。テーブル・型・型安全クエリ/upsert は Drizzle、FTS5 仮想テーブル・同期トリガー・集計ビューは Drizzle が表現できないため生 SQL のカスタムマイグレーションで補う(ハイブリッド)。本番は wrangler 経由で D1 に適用、テストは Drizzle の better-sqlite3 マイグレータで同じマイグレーションを検証。
- **検証: Valibot**(scraper の境界でパース結果を検証)。**lint/format: oxlint + oxfmt**。**CI: GitHub Actions**(PR で lint/typecheck/test)。

リポジトリ構成(pnpm workspace モノレポ):

```
giin-log/
├── web/            # TanStack Start アプリ(Feature-Sliced Design) + wrangler 設定 + D1 binding
├── scraper/        # Node 収集スクリプト群 + パーサ単体テスト(Valibot 検証)
├── db/             # Drizzle スキーマ + マイグレーション + 推論された共有型
├── .github/workflows/   # CI(lint/typecheck/test) + 収集の定期実行 cron
├── docs/
├── CLAUDE.md
└── README.md
```

### web の内部構成(Feature-Sliced Design)

web パッケージは FSD で構成する(db/scraper は対象外)。**pages レイヤーは置かず、TanStack Router のファイルベースルーティングが pages 相当の「薄い合成層」を担う**。

```
web/src/
├── routes/      # TanStack Router ファイルベースルーティング(各レイヤーを合成)
├── app/         # プロバイダ・ルートレイアウト・全体スタイル
├── widgets/     # 複合UIブロック(任意)
├── features/    # ユーザー操作(発言検索・会派フィルタ・並べ替え)
├── entities/    # 業務エンティティ(councilor / statement / meeting / term):model + ui + api
└── shared/      # UIキット・lib・config・D1アクセス(drizzle-orm/d1 + @giin-log/db のスキーマ共有)
```

依存ルール: 上位は下位のみ import 可(`routes → widgets → features → entities → shared`)。`entities/*` の型は `@giin-log/db` の推論型を再 export して用いる。

## 5. データモデル (D1 / SQLite)

「人(議員)」と「任期ごとに変わる属性」を分離する。これで過去・未来の任期、会派変更、議員の入れ替わりに耐える。

| テーブル | 役割 | 主なカラム |
|---|---|---|
| `councilors` | 議員=人(任期をまたぐ同一人物) | `id`, `slug`, `name`, `name_kana`, `photo_url`, `created_at`, `updated_at` |
| `terms` | 任期/期 | `id`, `name`, `starts_on`, `ends_on` |
| `memberships` | 議員×任期(変動属性) | `id`, `councilor_id`, `term_id`, `faction`(会派), `election_count`(当選回数), `area`, `phone`, `committees`(JSON), `roles`(JSON) |
| `meetings` | 会議 | `id`, `term_id`, `kind`(本会議/委員会), `name`, `held_on`, `source_url` |
| `attendances` | 会議×議員の出欠 | `id`, `meeting_id`, `councilor_id`, `status`(present/absent) |
| `statements` | 発言(発言・一般質問・質疑) | `id`, `meeting_id`, `councilor_id`, `kind`(general_question/question/discussion/other), `sequence`, `title`(質問テーマ), `body`, `body_tokenized`(kuromoji 分かち書き), `topics`(JSON), `source_url` |

補足:

- SQLite に配列・JSONB が無いため、`committees`/`roles`/`topics` は JSON 文字列(`TEXT`)で保持。
- 日時は ISO 8601 文字列(`TEXT`)で保持(SQLite に DATE 型は無い)。
- **集計はビューで算出**(アプリに計算ロジックを持たせない):
  - `councilor_stats`(議員×任期ごと): 一般質問回数、発言件数、本会議出席率。
- **全文検索**: `statements_fts` を FTS5 仮想テーブル(`tokenize='unicode61'`)として作り、`body_tokenized` と `title` をインデックス。本文は収集時に kuromoji で分かち書きしてから保存するため、語単位の日本語検索ができる。検索結果のランキングは bm25 を使用。

## 6. 収集パイプライン (scraper)

ソースごとに独立したパーサを用意し、冪等 upsert で投入する。

1. **議員名簿パーサ** → `councilors` + `memberships`(最初に着手。受け皿)
2. **会議日程パーサ** → `meetings`
3. **発言順位表パーサ(年度別)** → `statements`(`kind=general_question`, `title=テーマ`)。本文公開前でも取れる軽量ソース
4. **会議録パーサ(ぎょうせい Discuss)** → `statements` 本文 + `attendances`(冒頭の出席/欠席名簿)。**Shift-JIS デコード・CGI フォーム解析**が必要

共通方針:

- **文字コード**: iconv-lite で Shift-JIS を判定・デコード。
- **冪等性**: 自然キー(例: `source_url` + `sequence`)で upsert。再実行・差分更新で重複しない。
- **分かち書き**: 本文保存前に kuromoji.js で `body_tokenized` を生成。
- **構造変化の検知(サイレント失敗防止)**: 必須フィールドの欠落やパース結果 0 件は「成功」とせず、プロセスを失敗終了させて GitHub Actions を赤くする。
- **負荷配慮**: リクエスト間隔を空け、User-Agent を明示。会期後の月次チェックで十分(毎日クロール不要)。

## 7. 表示 (web / TanStack Start on Cloudflare)

- **トップ(議員一覧)**: 議員カード(写真・氏名・会派・一般質問回数・本会議出席率)。会派フィルタ・並べ替え。
- **議員詳細**: プロフィール + 活動タイムライン(発言・一般質問を時系列) + 統計(一般質問回数・本会議出席率) + 関心テーマ(`topics` タグ)。
- **発言検索**: キーワード・議員・会議名・期間で全文検索(FTS5 + kuromoji)。結果は関連度順(bm25)。
- **会議一覧**: 日付順、各会議の登壇者一覧。
- **透明性**: 全データに公式サイトへの出典リンクと最終更新日を表示し、一次情報へ辿れるようにする(信頼性の要)。

## 8. アクセス制御

- D1 に RLS は無いが、扱うのは公開情報。
- Worker は読み取りクエリのみを公開する。
- 書き込みは scraper(D1 HTTP API + API トークン)に限定。トークンは Actions の Secrets / ローカルの環境変数で管理し、コミットしない。

## 9. エラー処理・テスト

- **scraper のテスト**: 保存した HTML フィクスチャ(**Shift-JIS のものを含む**)に対するパーサ単体テストを中心に据える(ネットワーク非依存で安定)。
- **web のテスト**: 主要ページの loader / コンポーネントテスト。
- **scraper の失敗ポリシー**: 部分失敗で全体を壊さない(ソース単位で独立)。一方で必須データ欠落は明示的に失敗させる。

## 10. 段階移行と運用

- 初期は手動実行(`pnpm scrape`)でデータ投入・検証。
- 同じスクリプトを GitHub Actions の cron に載せて自動化(案 A)。
- 会議録の確定は会期終了から数週間〜数ヶ月遅れるため、月次実行で十分。

## 11. 既知の未確定事項(実装着手前に確認)

- 会議録検索システム(Discuss)の具体的な CGI クエリ/POST フォーム仕様(実アクセスで解析する)。
- `kensakusystem.jp` の利用規約の最終確認。
- 発言順位表 年度別ページの正確な HTML 構造(実アクセスで確認する)。
- 現任期の正確な期間(`terms` の `starts_on`/`ends_on`)。
- 議員別賛否 PDF のレイアウト(Phase 2 着手時)。
