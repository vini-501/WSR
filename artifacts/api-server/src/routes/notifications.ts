import { Router, type IRouter } from "express";
import { eq, and, count, desc, isNull, or, ilike } from "drizzle-orm";
import { db, notificationsTable, employeesTable, weeklyReportsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/rbac";
import { createNotification, notifyAll } from "../lib/notifications";
import { queueEmail } from "../lib/emailService";

const router: IRouter = Router();

router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const { page = "1", limit = "20", unread_only, type, search } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [eq(notificationsTable.user_id, user.id)];
  if (unread_only === "true") conditions.push(eq(notificationsTable.is_read, false));
  if (type) conditions.push(eq(notificationsTable.type, type as any));
  if (search) {
    conditions.push(
      or(
        ilike(notificationsTable.title, `%${search}%`),
        ilike(notificationsTable.message, `%${search}%`)
      ) as any
    );
  }

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

router.put("/notifications/:id/unread", requireAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const user = req.user!;

  const [notif] = await db
    .update(notificationsTable)
    .set({ is_read: false })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.user_id, user.id)))
    .returning();

  if (!notif) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }

  res.json({ ...notif, created_at: notif.created_at.toISOString() });
});

router.delete("/notifications/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const user = req.user!;

  const [notif] = await db
    .delete(notificationsTable)
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.user_id, user.id)))
    .returning();

  if (!notif) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }

  res.json({ success: true, message: "Notification deleted" });
});

router.delete("/notifications", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;

  await db
    .delete(notificationsTable)
    .where(eq(notificationsTable.user_id, user.id));

  res.json({ success: true, message: "All notifications deleted" });
});

router.post(
  "/notifications/announcements",
  requireAuth,
  requireRole("admin", "management"),
  async (req, res): Promise<void> => {
    const { title, message, type = "announcement" } = req.body;
    if (!title || !message) {
      res.status(400).json({ error: "title and message are required" });
      return;
    }

    await notifyAll({
      type: type as any,
      title,
      message,
    });

    res.json({ success: true, message: "Announcement broadcasted successfully" });
  }
);

router.post(
  "/notifications/trigger-reminders",
  requireAuth,
  requireRole("admin", "management"),
  async (req, res): Promise<void> => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    const weekStartStr = monday.toISOString().split("T")[0];

    const activeEmployees = await db
      .select({ id: employeesTable.id, name: employeesTable.name, email: employeesTable.email })
      .from(employeesTable)
      .where(
        and(
          eq(employeesTable.status, "active"),
          isNull(employeesTable.deleted_at)
        )
      );

    const submittedOrDraft = await db
      .select({ employee_id: weeklyReportsTable.employee_id })
      .from(weeklyReportsTable)
      .where(
        and(
          eq(weeklyReportsTable.week_start, weekStartStr),
          isNull(weeklyReportsTable.deleted_at)
        )
      );

    const submittedSet = new Set(submittedOrDraft.map(r => r.employee_id));

    let triggeredCount = 0;
    for (const emp of activeEmployees) {
      if (!submittedSet.has(emp.id)) {
        await createNotification({
          userId: emp.id,
          type: "reminder",
          title: "Weekly WCR Submission Reminder",
          message: `Hi ${emp.name}, please don't forget to submit your Weekly Company Report (WCR) for the week of ${weekStartStr}.`,
        });
        queueEmail({
          recipientEmail: emp.email,
          recipientName: emp.name,
          triggerEvent: "weekly_reminder",
          templateData: {
            recipientName: emp.name,
            weekStart: weekStartStr,
          },
        });
        triggeredCount++;
      }
    }

    res.json({
      success: true,
      message: `Triggered reminders for ${triggeredCount} employee(s) for the week of ${weekStartStr}.`,
    });
  }
);

export default router;
