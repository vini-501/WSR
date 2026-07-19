import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const reportingFrequencyEnum = pgEnum("reporting_frequency", [
  "weekly",
  "biweekly",
  "monthly",
]);

export const departmentStatusEnum = pgEnum("department_status", [
  "active",
  "inactive",
]);

export const departmentsTable = pgTable("departments", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  head_id: uuid("head_id"), // references employees.id
  status: departmentStatusEnum("status").notNull().default("active"),
  reporting_frequency: reportingFrequencyEnum("reporting_frequency")
    .notNull()
    .default("weekly"),
  reminder_day: text("reminder_day"),
  reminder_time: text("reminder_time"),
  submission_deadline: text("submission_deadline"),
  automation_source: text("automation_source"),
  recipients: text("recipients").array().notNull().default([]),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
  deleted_at: timestamp("deleted_at"),
});

export const insertDepartmentSchema = createInsertSchema(departmentsTable).omit({
  id: true,
  created_at: true,
  updated_at: true,
  deleted_at: true,
});

export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type Department = typeof departmentsTable.$inferSelect;
