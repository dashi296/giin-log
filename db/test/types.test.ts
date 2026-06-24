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
      sourceUrl: 'https://example.com',
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
