import { db, notificationsTable, employeesTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import { logger } from "./logger";

export type NotificationType =
  | "reminder"
  | "approval"
  | "rejected"
  | "deadline"
  | "announcement"
  | "needs_changes";

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
}

/**
 * Creates a single notification in the database
 */
export async function createNotification(params: CreateNotificationParams): Promise<void> {
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

/**
 * Sends a notification to all active employees of a specific role
 */
export async function notifyRole(
  role: "admin" | "management" | "department_head" | "employee",
  params: Omit<CreateNotificationParams, "userId">
): Promise<void> {
  try {
    const targets = await db
      .select({ id: employeesTable.id })
      .from(employeesTable)
      .where(
        and(
          eq(employeesTable.role, role),
          eq(employeesTable.status, "active"),
          isNull(employeesTable.deleted_at)
        )
      );

    for (const target of targets) {
      await createNotification({ ...params, userId: target.id });
    }
  } catch (err) {
    logger.error({ err, role }, "Failed to notify role");
  }
}

/**
 * Sends a notification to all active Department Heads in a specific department
 */
export async function notifyDepartmentHeads(
  departmentId: string,
  params: Omit<CreateNotificationParams, "userId">
): Promise<void> {
  try {
    const heads = await db
      .select({ id: employeesTable.id })
      .from(employeesTable)
      .where(
        and(
          eq(employeesTable.department_id, departmentId),
          eq(employeesTable.role, "department_head"),
          eq(employeesTable.status, "active"),
          isNull(employeesTable.deleted_at)
        )
      );

    for (const head of heads) {
      await createNotification({ ...params, userId: head.id });
    }
  } catch (err) {
    logger.error({ err, departmentId }, "Failed to notify department heads");
  }
}

/**
 * Sends a notification to all active managers and admins
 */
export async function notifyManagersAndAdmins(
  params: Omit<CreateNotificationParams, "userId">
): Promise<void> {
  try {
    const users = await db
      .select({ id: employeesTable.id, role: employeesTable.role })
      .from(employeesTable)
      .where(
        and(
          eq(employeesTable.status, "active"),
          isNull(employeesTable.deleted_at)
        )
      );

    for (const user of users) {
      if (user.role === "admin" || user.role === "management") {
        await createNotification({ ...params, userId: user.id });
      }
    }
  } catch (err) {
    logger.error({ err }, "Failed to notify managers/admins");
  }
}

/**
 * Sends a notification to all active members of a specific department
 */
export async function notifyDepartmentMembers(
  departmentId: string,
  params: Omit<CreateNotificationParams, "userId">
): Promise<void> {
  try {
    const members = await db
      .select({ id: employeesTable.id })
      .from(employeesTable)
      .where(
        and(
          eq(employeesTable.department_id, departmentId),
          eq(employeesTable.status, "active"),
          isNull(employeesTable.deleted_at)
        )
      );

    for (const member of members) {
      await createNotification({ ...params, userId: member.id });
    }
  } catch (err) {
    logger.error({ err, departmentId }, "Failed to notify department members");
  }
}

/**
 * Sends a notification to all active employees in the organization
 */
export async function notifyAll(
  params: Omit<CreateNotificationParams, "userId">
): Promise<void> {
  try {
    const targets = await db
      .select({ id: employeesTable.id })
      .from(employeesTable)
      .where(
        and(
          eq(employeesTable.status, "active"),
          isNull(employeesTable.deleted_at)
        )
      );

    for (const target of targets) {
      await createNotification({ ...params, userId: target.id });
    }
  } catch (err) {
    logger.error({ err }, "Failed to notify all active users");
  }
}

