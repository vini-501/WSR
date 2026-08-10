import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const workflowsTable = pgTable("workflows", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(), // 'weekly_reminder' | 'overdue_escalation' | 'ai_executive_summary' | 'executive_digest' | 'dept_review_alert' | 'late_submission_report'
  description: text("description").notNull(),
  trigger_type: text("trigger_type").notNull().default("cron"), // 'cron' | 'event' | 'webhook' | 'manual'
  schedule_cron: text("schedule_cron").notNull().default("0 10 * * 5"),
  n8n_webhook_url: text("n8n_webhook_url").notNull().default(""),
  n8n_workflow_id: text("n8n_workflow_id").notNull().default(""),
  enabled: boolean("enabled").notNull().default(true),
  config: jsonb("config").notNull().default({}),
  last_run_at: timestamp("last_run_at"),
  next_run_at: timestamp("next_run_at"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const insertWorkflowSchema = createInsertSchema(workflowsTable).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertWorkflow = z.infer<typeof insertWorkflowSchema>;
export type Workflow = typeof workflowsTable.$inferSelect;
