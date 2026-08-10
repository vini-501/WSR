import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const escalationsTable = pgTable(
  "escalations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employee_id: uuid("employee_id").notNull(),
    employee_name: text("employee_name").notNull(),
    report_id: uuid("report_id"),
    week_start: text("week_start").notNull(),
    level: integer("level").notNull().default(1), // 1 = Employee Reminder, 2 = Department Head Escalation, 3 = Executive Escalation
    status: text("status").notNull().default("pending"), // 'pending' | 'resolved' | 'escalated'
    escalated_to_id: uuid("escalated_to_id"),
    escalated_to_name: text("escalated_to_name"),
    notes: text("notes"),
    escalated_at: timestamp("escalated_at").notNull().defaultNow(),
    resolved_at: timestamp("resolved_at"),
    created_at: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_escalations_employee_id").on(table.employee_id),
    index("idx_escalations_week_start").on(table.week_start),
    index("idx_escalations_status").on(table.status),
  ]
);

export const insertEscalationSchema = createInsertSchema(escalationsTable).omit({
  id: true,
  created_at: true,
});

export type InsertEscalation = z.infer<typeof insertEscalationSchema>;
export type Escalation = typeof escalationsTable.$inferSelect;
