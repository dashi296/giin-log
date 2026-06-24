import type {
  councilors,
  terms,
  memberships,
  meetings,
  attendances,
  statements,
  councilorStats,
} from "./schema.js"
import type { InferModelFromColumns, Column } from "drizzle-orm"

export type Councilor = typeof councilors.$inferSelect
export type NewCouncilor = typeof councilors.$inferInsert
export type Term = typeof terms.$inferSelect
export type NewTerm = typeof terms.$inferInsert
export type Membership = typeof memberships.$inferSelect
export type NewMembership = typeof memberships.$inferInsert
export type Meeting = typeof meetings.$inferSelect
export type NewMeeting = typeof meetings.$inferInsert
export type Attendance = typeof attendances.$inferSelect
export type NewAttendance = typeof attendances.$inferInsert
export type Statement = typeof statements.$inferSelect
export type NewStatement = typeof statements.$inferInsert

// Views do not have $inferSelect in Drizzle 0.33.
// Extract the row type by filtering the view's own column properties.
type ViewColumns<T,> = {
  [K in keyof T as T[K] extends Column ? K : never]: T[K] extends Column
    ? T[K]
    : never
}
export type CouncilorStats = InferModelFromColumns<ViewColumns<typeof councilorStats>>

export type StatementKind = Statement["kind"]
export type AttendanceStatus = Attendance["status"]
export type MeetingKind = Meeting["kind"]
