import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const reportStatusEnum = pgEnum("report_status", [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "needs_changes",
]);

export const weeklyReportsTable = pgTable("weekly_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  employee_id: uuid("employee_id").notNull(), // references employees.id
  department_id: uuid("department_id"),       // references departments.id
  week_start: text("week_start").notNull(),   // ISO date string YYYY-MM-DD
  achievements: text("achievements").notNull(),
  completed_tasks: text("completed_tasks").notNull(),
  blockers: text("blockers"),
  next_week_plans: text("next_week_plans").notNull(),
  additional_notes: text("additional_notes"),
  status: reportStatusEnum("status").notNull().default("draft"),
  reviewer_id: uuid("reviewer_id"),
  review_comment: text("review_comment"),
  reviewed_at: timestamp("reviewed_at"),
  submitted_at: timestamp("submitted_at"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
  deleted_at: timestamp("deleted_at"),
});

export const insertReportSchema = createInsertSchema(weeklyReportsTable).omit({
  id: true,
  created_at: true,
  updated_at: true,
  deleted_at: true,
});

export type InsertReport = z.infer<typeof insertReportSchema>;
export type WeeklyReport = typeof weeklyReportsTable.$inferSelect;
