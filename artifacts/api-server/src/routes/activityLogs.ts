import { Router, type IRouter } from "express";
import { eq, and, count, desc } from "drizzle-orm";
import { db, activityLogsTable, employeesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { MANAGEMENT_AND_ADMIN } from "../middlewares/rbac";

const router: IRouter = Router();

router.get("/activity-logs", requireAuth, MANAGEMENT_AND_ADMIN, async (req, res): Promise<void> => {
  const { user_id, action, page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  if (user_id) conditions.push(eq(activityLogsTable.user_id, user_id));
  if (action) conditions.push(eq(activityLogsTable.action, action));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(activityLogsTable).where(where);

  const logs = await db
    .select()
    .from(activityLogsTable)
    .where(where)
    .orderBy(desc(activityLogsTable.created_at))
    .limit(limitNum)
    .offset(offset);

  const enriched = await Promise.all(
    logs.map(async (log) => {
      let user_name: string | null = null;
      let user_photo: string | null = null;
      if (log.user_id) {
        const [emp] = await db
          .select({ name: employeesTable.name, photo_url: employeesTable.photo_url })
          .from(employeesTable)
          .where(eq(employeesTable.id, log.user_id))
          .limit(1);
        user_name = emp?.name ?? null;
        user_photo = emp?.photo_url ?? null;
      }
      return { ...log, user_name, user_photo, created_at: log.created_at.toISOString() };
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
