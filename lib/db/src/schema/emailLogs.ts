import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const emailLogsTable = pgTable(
  "email_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipient: text("recipient").notNull(),
    subject: text("subject").notNull(),
    trigger_event: text("trigger_event").notNull(),
    status: text("status").notNull().default("sent"), // 'sent' | 'failed' | 'pending'
    error_details: text("error_details"),
    metadata: jsonb("metadata"),
    sent_at: timestamp("sent_at").defaultNow(),
    created_at: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_email_logs_recipient").on(table.recipient),
    index("idx_email_logs_status").on(table.status),
    index("idx_email_logs_trigger").on(table.trigger_event),
    index("idx_email_logs_created_at").on(table.created_at),
  ]
);

export const insertEmailLogSchema = createInsertSchema(emailLogsTable).omit({
  id: true,
  created_at: true,
});

export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;
export type EmailLog = typeof emailLogsTable.$inferSelect;
