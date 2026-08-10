import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const notificationTypeEnum = pgEnum("notification_type", [
  "reminder",
  "approval",
  "rejected",
  "deadline",
  "announcement",
  "needs_changes",
]);

export const notificationsTable = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id").notNull(), // references employees.id
    type: notificationTypeEnum("type").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    entity_type: text("entity_type"),
    entity_id: uuid("entity_id"),
    is_read: boolean("is_read").notNull().default(false),
    created_at: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_notifications_user_id").on(table.user_id),
    index("idx_notifications_user_unread").on(table.user_id, table.is_read),
    index("idx_notifications_created_at").on(table.created_at),
  ]
);

export const insertNotificationSchema = createInsertSchema(notificationsTable).omit({
  id: true,
  created_at: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notificationsTable.$inferSelect;
