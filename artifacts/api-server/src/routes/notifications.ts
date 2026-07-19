import { Router, type IRouter } from "express";
import { eq, and, count, desc } from "drizzle-orm";
import { db, notificationsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const { page = "1", limit = "20", unread_only } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [eq(notificationsTable.user_id, user.id)];
  if (unread_only === "true") conditions.push(eq(notificationsTable.is_read, false));

  const where = and(...conditions);
  const [{ total }] = await db.select({ total: count() }).from(notificationsTable).where(where);
  const [{ unread }] = await db.select({ unread: count() }).from(notificationsTable).where(and(eq(notificationsTable.user_id, user.id), eq(notificationsTable.is_read, false)));

  const notifs = await db
    .select()
    .from(notificationsTable)
    .where(where)
    .orderBy(desc(notificationsTable.created_at))
    .limit(limitNum)
    .offset(offset);

  res.json({
    data: notifs.map((n) => ({ ...n, created_at: n.created_at.toISOString() })),
    total: Number(total),
    page: pageNum,
    limit: limitNum,
    total_pages: Math.ceil(Number(total) / limitNum),
    unread_count: Number(unread),
  });
});

router.get("/notifications/unread-count", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const [{ c }] = await db
    .select({ c: count() })
    .from(notificationsTable)
    .where(and(eq(notificationsTable.user_id, user.id), eq(notificationsTable.is_read, false)));
  res.json({ count: Number(c) });
});

router.put("/notifications/read-all", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  await db
    .update(notificationsTable)
    .set({ is_read: true })
    .where(and(eq(notificationsTable.user_id, user.id), eq(notificationsTable.is_read, false)));
  res.json({ success: true, message: "All notifications marked as read" });
});

router.put("/notifications/:id/read", requireAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const user = req.user!;

  const [notif] = await db
    .update(notificationsTable)
    .set({ is_read: true })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.user_id, user.id)))
    .returning();

  if (!notif) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }

  res.json({ ...notif, created_at: notif.created_at.toISOString() });
});

export default router;
