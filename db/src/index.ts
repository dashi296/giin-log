export * from './schema.js';

import {
  councilors,
  terms,
  memberships,
  meetings,
  attendances,
  statements,
} from './schema.js';

// 共有行型は Drizzle スキーマから導出する(手書き型を作らない)。
export type Councilor = typeof councilors.$inferSelect;
export type NewCouncilor = typeof councilors.$inferInsert;

export type Term = typeof terms.$inferSelect;
export type NewTerm = typeof terms.$inferInsert;

export type Membership = typeof memberships.$inferSelect;
export type NewMembership = typeof memberships.$inferInsert;

export type Meeting = typeof meetings.$inferSelect;
export type NewMeeting = typeof meetings.$inferInsert;

export type Attendance = typeof attendances.$inferSelect;
export type NewAttendance = typeof attendances.$inferInsert;

export type Statement = typeof statements.$inferSelect;
export type NewStatement = typeof statements.$inferInsert;
