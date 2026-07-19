import { db, activityLogsTable, auditLogsTable } from "@workspace/db";
import type { Employee } from "@workspace/db";
import { logger } from "./logger";

export async function logActivity(params: {
  user?: Employee | null;
  action: string;
  entityType?: string;
  entityId?: string;
  description: string;
  ipAddress?: string;
}): Promise<void> {
  try {
    await db.insert(activityLogsTable).values({
      user_id: params.user?.id ?? null,
      action: params.action,
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ?? null,
      description: params.description,
      ip_address: params.ipAddress ?? null,
    });
  } catch (err) {
    logger.error({ err }, "Failed to write activity log");
  }
}

export async function logAudit(params: {
  user?: Employee | null;
  tableName: string;
  operation: "INSERT" | "UPDATE" | "DELETE";
  recordId?: string;
  oldValues?: unknown;
  newValues?: unknown;
}): Promise<void> {
  try {
    await db.insert(auditLogsTable).values({
      user_id: params.user?.id ?? null,
      table_name: params.tableName,
      operation: params.operation,
      record_id: params.recordId ?? null,
      old_values: params.oldValues ? JSON.stringify(params.oldValues) : null,
      new_values: params.newValues ? JSON.stringify(params.newValues) : null,
    });
  } catch (err) {
    logger.error({ err }, "Failed to write audit log");
  }
}
