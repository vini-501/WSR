import { db, notificationsTable } from "@workspace/db";
import { logger } from "./logger";

type NotificationType =
  | "reminder"
  | "approval"
  | "rejected"
  | "deadline"
  | "announcement"
  | "needs_changes";

export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
}): Promise<void> {
  try {
    await db.insert(notificationsTable).values({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ? (params.entityId as `${string}-${string}-${string}-${string}-${string}`) : null,
      is_read: false,
    });
  } catch (err) {
    logger.error({ err }, "Failed to create notification");
  }
}
