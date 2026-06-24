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
