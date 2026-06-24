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
