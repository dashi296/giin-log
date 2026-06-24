import { describe, it, expect } from 'vitest';
import { makeTestDb } from './helpers.js';

function seedBase(sqlite: ReturnType<typeof makeTestDb>['sqlite']) {
  sqlite.exec(`
    INSERT INTO terms (id, name, starts_on, source_url)
      VALUES (1, '第1期', '2023-05-01', 'https://example.com/t1');
    INSERT INTO councilors (id, slug, name, source_url)
      VALUES (1, 'taro', '山田太郎', 'https://example.com/c1');
    INSERT INTO meetings (id, term_id, kind, name, held_on, source_url)
      VALUES (1, 1, '本会議', '6月定例会', '2026-06-10', 'https://example.com/m1');
  `);
}

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
    seedBase(sqlite);
    sqlite.exec(`
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

  it('enforces the attendances status check constraint', () => {
    const { sqlite } = makeTestDb();
    seedBase(sqlite);
    const bad = () =>
      sqlite
        .prepare(
          `INSERT INTO attendances (meeting_id, councilor_id, status) VALUES (1, 1, 'maybe')`,
        )
        .run();
    expect(bad).toThrow(/CHECK/);
  });

  it('enforces the meetings kind check constraint', () => {
    const { sqlite } = makeTestDb();
    sqlite.exec(`
      INSERT INTO terms (id, name, starts_on, source_url)
        VALUES (1, '第1期', '2023-05-01', 'https://example.com/t1');
    `);
    const bad = () =>
      sqlite
        .prepare(
          `INSERT INTO meetings (term_id, kind, name, held_on, source_url)
           VALUES (1, 'foo', '6月定例会', '2026-06-10', 'https://example.com/m9')`,
        )
        .run();
    expect(bad).toThrow(/CHECK/);
  });

  it('enforces the statements kind check constraint', () => {
    const { sqlite } = makeTestDb();
    seedBase(sqlite);
    const bad = () =>
      sqlite
        .prepare(
          `INSERT INTO statements (meeting_id, councilor_id, kind, sequence, source_url)
           VALUES (1, 1, 'foo', 1, 'https://example.com/s9')`,
        )
        .run();
    expect(bad).toThrow(/CHECK/);
  });

  it('keeps all manually-patched CHECK constraints in the migration', () => {
    const { sqlite } = makeTestDb();
    const rows = sqlite
      .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND sql IS NOT NULL")
      .all() as { sql: string }[];
    const allSql = rows.map((r) => r.sql).join('\n');
    for (const checkName of [
      'attendances_status_check',
      'statements_kind_check',
      'meetings_kind_check',
    ]) {
      expect(allSql).toContain(checkName);
    }
  });

  it('enforces meetings natural-key uniqueness', () => {
    const { sqlite } = makeTestDb();
    seedBase(sqlite);
    const dup = () =>
      sqlite
        .prepare(
          `INSERT INTO meetings (term_id, kind, name, held_on, source_url)
           VALUES (1, '本会議', '6月定例会', '2026-06-10', 'https://example.com/m2')`,
        )
        .run();
    expect(dup).toThrow(/UNIQUE/);
  });

  it('enforces memberships councilor+term uniqueness', () => {
    const { sqlite } = makeTestDb();
    seedBase(sqlite);
    sqlite.exec(`
      INSERT INTO memberships (councilor_id, term_id, source_url)
        VALUES (1, 1, 'https://example.com/mb1');
    `);
    const dup = () =>
      sqlite
        .prepare(
          `INSERT INTO memberships (councilor_id, term_id, source_url)
           VALUES (1, 1, 'https://example.com/mb2')`,
        )
        .run();
    expect(dup).toThrow(/UNIQUE/);
  });

  it('requires provenance source_url on councilors', () => {
    const { sqlite } = makeTestDb();
    const bad = () =>
      sqlite
        .prepare(`INSERT INTO councilors (slug, name) VALUES ('x', '無出典')`)
        .run();
    expect(bad).toThrow(/NOT NULL/);
  });

  it('requires provenance source_url on terms', () => {
    const { sqlite } = makeTestDb();
    const bad = () =>
      sqlite
        .prepare(`INSERT INTO terms (name, starts_on) VALUES ('第2期', '2027-05-01')`)
        .run();
    expect(bad).toThrow(/NOT NULL/);
  });

  it('requires provenance source_url on memberships', () => {
    const { sqlite } = makeTestDb();
    seedBase(sqlite);
    const bad = () =>
      sqlite
        .prepare(`INSERT INTO memberships (councilor_id, term_id) VALUES (1, 1)`)
        .run();
    expect(bad).toThrow(/NOT NULL/);
  });

  it('enforces attendances natural-key uniqueness', () => {
    const { sqlite } = makeTestDb();
    seedBase(sqlite);
    sqlite.exec(`
      INSERT INTO attendances (meeting_id, councilor_id, status) VALUES (1, 1, 'present');
    `);
    const dup = () =>
      sqlite
        .prepare(
          `INSERT INTO attendances (meeting_id, councilor_id, status) VALUES (1, 1, 'absent')`,
        )
        .run();
    expect(dup).toThrow(/UNIQUE/);
  });

  it('enforces councilors.slug uniqueness', () => {
    const { sqlite } = makeTestDb();
    seedBase(sqlite);
    const dup = () =>
      sqlite
        .prepare(
          `INSERT INTO councilors (slug, name, source_url) VALUES ('taro', '別人', 'https://example.com/c2')`,
        )
        .run();
    expect(dup).toThrow(/UNIQUE/);
  });

  it('enforces terms.name uniqueness', () => {
    const { sqlite } = makeTestDb();
    seedBase(sqlite);
    const dup = () =>
      sqlite
        .prepare(
          `INSERT INTO terms (name, starts_on, source_url) VALUES ('第1期', '2024-05-01', 'https://example.com/t2')`,
        )
        .run();
    expect(dup).toThrow(/UNIQUE/);
  });

  it('requires provenance source_url on meetings', () => {
    const { sqlite } = makeTestDb();
    seedBase(sqlite);
    const bad = () =>
      sqlite
        .prepare(
          `INSERT INTO meetings (term_id, kind, name, held_on) VALUES (1, '本会議', '7月臨時会', '2026-07-01')`,
        )
        .run();
    expect(bad).toThrow(/NOT NULL/);
  });

  it('requires provenance source_url on statements', () => {
    const { sqlite } = makeTestDb();
    seedBase(sqlite);
    const bad = () =>
      sqlite
        .prepare(
          `INSERT INTO statements (meeting_id, councilor_id, kind, sequence) VALUES (1, 1, 'general_question', 1)`,
        )
        .run();
    expect(bad).toThrow(/NOT NULL/);
  });

  it('rejects an explicit NULL updated_at', () => {
    const { sqlite } = makeTestDb();
    seedBase(sqlite);
    // DEFAULT は値省略時のみ適用される。明示的に NULL を渡すと NOT NULL 制約で弾かれる。
    const bad = () =>
      sqlite
        .prepare(
          `INSERT INTO meetings (term_id, kind, name, held_on, source_url, updated_at)
           VALUES (1, '本会議', '7月臨時会', '2026-07-01', 'https://example.com/m3', NULL)`,
        )
        .run();
    expect(bad).toThrow(/NOT NULL/);
  });
});
