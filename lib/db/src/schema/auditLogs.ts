import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const auditOperationEnum = pgEnum("audit_operation", [
  "INSERT",
  "UPDATE",
  "DELETE",
]);

export const auditLogsTable = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id"),
  table_name: text("table_name").notNull(),
  operation: auditOperationEnum("operation").notNull(),
  record_id: text("record_id"),
  old_values: text("old_values"),  // JSON string
  new_values: text("new_values"),  // JSON string
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogsTable).omit({
  id: true,
  created_at: true,
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogsTable.$inferSelect;
