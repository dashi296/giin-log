import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { makeTestDb } from './helpers.js';

function setup(): Database.Database {
  const { sqlite } = makeTestDb();
  sqlite.exec(`
    INSERT INTO terms (id, name, starts_on, source_url) VALUES (1, '第1期', '2023-05-01', 'https://example.com/t1');
    INSERT INTO councilors (id, slug, name, source_url) VALUES (1, 'taro', '山田太郎', 'https://example.com/c1');
    INSERT INTO memberships (id, councilor_id, term_id, source_url) VALUES (1, 1, 1, 'https://example.com/mb1');

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
      INSERT INTO terms (id, name, starts_on, source_url) VALUES (1, '第1期', '2023-05-01', 'https://example.com/t1');
      INSERT INTO councilors (id, slug, name, source_url) VALUES (1, 'taro', '山田太郎', 'https://example.com/c1');
      INSERT INTO memberships (id, councilor_id, term_id, source_url) VALUES (1, 1, 1, 'https://example.com/mb1');
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
