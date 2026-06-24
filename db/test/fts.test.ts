import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { makeTestDb } from './helpers.js';

function base(sqlite: Database.Database) {
  sqlite.exec(`
    INSERT INTO terms (id, name, starts_on, source_url) VALUES (1, '第1期', '2023-05-01', 'https://example.com/t1');
    INSERT INTO councilors (id, slug, name, source_url) VALUES (1, 'taro', '山田太郎', 'https://example.com/c1');
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
