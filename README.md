# giin-log — 大津市議会 議員活動ログ

大津市(滋賀県)の市議会議員の活動を、市民が分かりやすく閲覧できる Web サイトです。
議会の公開情報(議員名簿・会議録の発言・一般質問・出席状況)を自動収集し、議員ごとに「何を発言し、どんなテーマに取り組んでいるか」を見える化します。

> **ステータス: 設計フェーズ。** 実装はこれからです。
> 設計の詳細は [`docs/superpowers/specs/2026-06-24-otsu-giin-log-design.md`](docs/superpowers/specs/2026-06-24-otsu-giin-log-design.md) を参照してください。

## できること(MVP)

- 議員一覧(写真・会派・一般質問回数・本会議出席率)
- 議員ごとの活動タイムラインと関心テーマ
- 発言の全文検索(日本語対応)
- 全データに公式サイトへの出典リンクと最終更新日を表示

MVP は現任期のみが対象ですが、データ構造は過去・未来の任期も扱えるよう設計しています。

## 技術スタック

| 領域 | 採用技術 |
|---|---|
| データベース | Cloudflare D1 (SQLite) |
| Web アプリ | TanStack Start |
| ホスティング | Cloudflare Workers |
| 収集(スクレイパ) | Node.js / TypeScript(cheerio, iconv-lite, kuromoji.js) |
| 定期実行 | GitHub Actions (cron) |
| パッケージ管理 | pnpm workspace(モノレポ) |

## リポジトリ構成

```
giin-log/
├── web/      # TanStack Start アプリ + wrangler 設定(D1 binding)
├── scraper/  # Node 収集スクリプト群 + パーサ単体テスト
├── db/       # D1 マイグレーション(SQL) + 共有 TypeScript 型
├── .github/workflows/   # 収集の定期実行 cron
└── docs/     # 設計ドキュメント等
```

## データソース

大津市議会の公開情報を収集対象としています。

- [大津市議会](https://www.city.otsu.lg.jp/gikai/index.html)
- [議員名簿](https://www.city.otsu.lg.jp/gikai/giin/1430447099023.html)
- [会議録検索システム](https://www.kensakusystem.jp/otsu/index.html)

robots.txt とサイト利用規約を尊重し、リクエスト間隔を空け、出典を明記した良識的な収集を行います。

## 開発

> セットアップ手順・コマンドは実装の進行に合わせて追記します。

```sh
pnpm install
# web:     pnpm --filter web dev
# scrape:  pnpm --filter scraper start
```

## ライセンス

未定。
