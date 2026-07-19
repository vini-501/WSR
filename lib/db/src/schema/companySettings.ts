import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const companySettingsTable = pgTable("company_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  company_name: text("company_name").notNull().default("Ellipsonic"),
  logo_url: text("logo_url"),
  timezone: text("timezone").notNull().default("UTC"),
  reporting_deadline_day: text("reporting_deadline_day").notNull().default("Friday"),
  reporting_deadline_time: text("reporting_deadline_time").notNull().default("17:00"),
  theme: text("theme").notNull().default("system"),
  allow_late_submissions: boolean("allow_late_submissions").notNull().default(true),
  require_manager_approval: boolean("require_manager_approval").notNull().default(true),
  notification_enabled: boolean("notification_enabled").notNull().default(true),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCompanySettingsSchema = createInsertSchema(
  companySettingsTable
).omit({ id: true, created_at: true, updated_at: true });

export type InsertCompanySettings = z.infer<typeof insertCompanySettingsSchema>;
export type CompanySettings = typeof companySettingsTable.$inferSelect;
