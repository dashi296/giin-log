import { sql } from 'drizzle-orm';
import {
  sqliteTable,
  sqliteView,
  integer,
  real,
  text,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/sqlite-core';

export const councilors = sqliteTable('councilors', {
  id: integer('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  nameKana: text('name_kana'),
  photoUrl: text('photo_url'),
  sourceUrl: text('source_url').notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%SZ','now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%SZ','now'))`),
});

export const terms = sqliteTable('terms', {
  id: integer('id').primaryKey(),
  name: text('name').notNull().unique(),
  startsOn: text('starts_on').notNull(),
  endsOn: text('ends_on'),
  sourceUrl: text('source_url').notNull(),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%SZ','now'))`),
});

export const memberships = sqliteTable(
  'memberships',
  {
    id: integer('id').primaryKey(),
    councilorId: integer('councilor_id')
      .notNull()
      .references(() => councilors.id),
    termId: integer('term_id')
      .notNull()
      .references(() => terms.id),
    faction: text('faction'),
    electionCount: integer('election_count'),
    area: text('area'),
    phone: text('phone'),
    committees: text('committees'),
    roles: text('roles'),
    sourceUrl: text('source_url').notNull(),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%SZ','now'))`),
  },
  (t) => ({
    uq: uniqueIndex('uq_memberships_councilor_term').on(t.councilorId, t.termId),
    termIdx: index('idx_memberships_term').on(t.termId),
  }),
);

export const meetings = sqliteTable(
  'meetings',
  {
    id: integer('id').primaryKey(),
    termId: integer('term_id')
      .notNull()
      .references(() => terms.id),
    kind: text('kind', { enum: ['本会議', '委員会'] }).notNull(),
    name: text('name').notNull(),
    heldOn: text('held_on').notNull(),
    sourceUrl: text('source_url').notNull(),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%SZ','now'))`),
  },
  (t) => ({
    uq: uniqueIndex('uq_meetings_natural').on(
      t.termId,
      t.kind,
      t.name,
      t.heldOn,
    ),
    termIdx: index('idx_meetings_term').on(t.termId),
    kindChk: check('meetings_kind_check', sql`${t.kind} IN ('本会議','委員会')`),
  }),
);

// 出席(attendances)に source_url 列は持たせない。
// 出席の出典は親の meetings.source_url を継承する(会議録ページに出欠が載るため)。
export const attendances = sqliteTable(
  'attendances',
  {
    id: integer('id').primaryKey(),
    meetingId: integer('meeting_id')
      .notNull()
      .references(() => meetings.id),
    councilorId: integer('councilor_id')
      .notNull()
      .references(() => councilors.id),
    status: text('status', { enum: ['present', 'absent'] }).notNull(),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%SZ','now'))`),
  },
  (t) => ({
    uq: uniqueIndex('uq_attendances_meeting_councilor').on(
      t.meetingId,
      t.councilorId,
    ),
    meetingIdx: index('idx_attendances_meeting').on(t.meetingId),
    councilorIdx: index('idx_attendances_councilor').on(t.councilorId),
    statusChk: check(
      'attendances_status_check',
      sql`${t.status} IN ('present','absent')`,
    ),
  }),
);

export const statements = sqliteTable(
  'statements',
  {
    id: integer('id').primaryKey(),
    meetingId: integer('meeting_id')
      .notNull()
      .references(() => meetings.id),
    councilorId: integer('councilor_id')
      .notNull()
      .references(() => councilors.id),
    kind: text('kind', {
      enum: ['general_question', 'question', 'discussion', 'other'],
    }).notNull(),
    sequence: integer('sequence').notNull(),
    title: text('title'),
    body: text('body'),
    bodyTokenized: text('body_tokenized'),
    topics: text('topics'),
    sourceUrl: text('source_url').notNull(),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%SZ','now'))`),
  },
  (t) => ({
    uq: uniqueIndex('uq_statements_natural').on(
      t.meetingId,
      t.councilorId,
      t.sequence,
    ),
    meetingIdx: index('idx_statements_meeting').on(t.meetingId),
    councilorIdx: index('idx_statements_councilor').on(t.councilorId),
    kindChk: check(
      'statements_kind_check',
      sql`${t.kind} IN ('general_question','question','discussion','other')`,
    ),
  }),
);

export const councilorStats = sqliteView('councilor_stats', {
  councilorId: integer('councilor_id').notNull(),
  termId: integer('term_id').notNull(),
  generalQuestionCount: integer('general_question_count').notNull(),
  statementCount: integer('statement_count').notNull(),
  honkaigiAttendanceRate: real('honkaigi_attendance_rate'),
}).existing();
