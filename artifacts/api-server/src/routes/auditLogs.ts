import { Router, type IRouter } from "express";
import { eq, and, count, desc } from "drizzle-orm";
import { db, auditLogsTable, employeesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { ADMIN_ONLY } from "../middlewares/rbac";

const router: IRouter = Router();

router.get("/audit-logs", requireAuth, ADMIN_ONLY, async (req, res): Promise<void> => {
  const { table_name, operation, page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  if (table_name) conditions.push(eq(auditLogsTable.table_name, table_name));
  if (operation) conditions.push(eq(auditLogsTable.operation, operation as "INSERT" | "UPDATE" | "DELETE"));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(auditLogsTable).where(where);

  const logs = await db
    .select()
    .from(auditLogsTable)
    .where(where)
    .orderBy(desc(auditLogsTable.created_at))
    .limit(limitNum)
    .offset(offset);

  const enriched = await Promise.all(
    logs.map(async (log) => {
      let user_name: string | null = null;
      if (log.user_id) {
        const [emp] = await db
          .select({ name: employeesTable.name })
          .from(employeesTable)
          .where(eq(employeesTable.id, log.user_id))
          .limit(1);
        user_name = emp?.name ?? null;
      }
      return { ...log, user_name, created_at: log.created_at.toISOString() };
    })
  );

  res.json({
    data: enriched,
    total: Number(total),
    page: pageNum,
    limit: limitNum,
    total_pages: Math.ceil(Number(total) / limitNum),
  });
});

export default router;
