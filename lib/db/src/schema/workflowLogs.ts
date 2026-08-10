import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const workflowLogsTable = pgTable(
  "workflow_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workflow_id: uuid("workflow_id"),
    workflow_name: text("workflow_name").notNull(),
    trigger_source: text("trigger_source").notNull().default("scheduled_cron"), // 'scheduled_cron' | 'event_hook' | 'n8n_webhook' | 'manual_admin'
    status: text("status").notNull().default("running"), // 'running' | 'success' | 'failed' | 'retrying'
    start_time: timestamp("start_time").notNull().defaultNow(),
    end_time: timestamp("end_time"),
    execution_time_ms: integer("execution_time_ms").notNull().default(0),
    retry_count: integer("retry_count").notNull().default(0),
    error_details: text("error_details"),
    payload: jsonb("payload"),
    created_at: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_workflow_logs_workflow_id").on(table.workflow_id),
    index("idx_workflow_logs_status").on(table.status),
    index("idx_workflow_logs_created_at").on(table.created_at),
  ]
);

export const insertWorkflowLogSchema = createInsertSchema(workflowLogsTable).omit({
  id: true,
  created_at: true,
});

export type InsertWorkflowLog = z.infer<typeof insertWorkflowLogSchema>;
export type WorkflowLog = typeof workflowLogsTable.$inferSelect;
