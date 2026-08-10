import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export interface EmailTriggersConfig {
  weekly_reminder: boolean;
  overdue_reminder: boolean;
  submission_confirmation: boolean;
  dept_head_review: boolean;
  report_approved: boolean;
  report_rejected: boolean;
  changes_requested: boolean;
  report_resubmitted: boolean;
  dept_completion: boolean;
  executive_summary: boolean;
  pending_approval_summary: boolean;
  late_submission_summary: boolean;
  welcome_email: boolean;
  account_activation: boolean;
  password_reset: boolean;
  role_update: boolean;
  department_transfer: boolean;
}

export const defaultEmailTriggers: EmailTriggersConfig = {
  weekly_reminder: true,
  overdue_reminder: true,
  submission_confirmation: true,
  dept_head_review: true,
  report_approved: true,
  report_rejected: true,
  changes_requested: true,
  report_resubmitted: true,
  dept_completion: true,
  executive_summary: true,
  pending_approval_summary: true,
  late_submission_summary: true,
  welcome_email: true,
  account_activation: true,
  password_reset: true,
  role_update: true,
  department_transfer: true,
};

export const emailSettingsTable = pgTable("email_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  enabled: boolean("enabled").notNull().default(true),
  provider: text("provider").notNull().default("gmail"), // 'gmail' | 'outlook' | 'custom'
  smtp_host: text("smtp_host").notNull().default("smtp.gmail.com"),
  smtp_port: integer("smtp_port").notNull().default(587),
  smtp_secure: boolean("smtp_secure").notNull().default(false),
  smtp_user: text("smtp_user").notNull().default(""),
  smtp_pass: text("smtp_pass").notNull().default(""),
  from_name: text("from_name").notNull().default("Ellipsonic WCR"),
  from_email: text("from_email").notNull().default("notifications@ellipsonic.com"),
  reminder_day: text("reminder_day").notNull().default("Friday"),
  reminder_time: text("reminder_time").notNull().default("10:00"),
  summary_schedule_day: text("summary_schedule_day").notNull().default("Monday"),
  summary_schedule_time: text("summary_schedule_time").notNull().default("09:00"),
  timezone: text("timezone").notNull().default("Asia/Kolkata (IST)"),
  triggers: jsonb("triggers").$type<EmailTriggersConfig>().notNull().default(defaultEmailTriggers),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const insertEmailSettingsSchema = createInsertSchema(emailSettingsTable).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertEmailSettings = z.infer<typeof insertEmailSettingsSchema>;
export type EmailSettings = typeof emailSettingsTable.$inferSelect;
