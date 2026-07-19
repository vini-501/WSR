import {
  pgTable,
  uuid,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const activityLogsTable = pgTable("activity_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id"),       // references employees.id (nullable: system events)
  action: text("action").notNull(), // e.g. login, logout, create, update, delete, approve, reject
  entity_type: text("entity_type"),
  entity_id: text("entity_id"),
  description: text("description").notNull(),
  ip_address: text("ip_address"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const insertActivityLogSchema = createInsertSchema(activityLogsTable).omit({
  id: true,
  created_at: true,
});

export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogsTable.$inferSelect;
