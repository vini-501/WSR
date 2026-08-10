import { Router, type IRouter } from "express";
import { eq, and, count, desc, ilike, gte, sql } from "drizzle-orm";
import { db, emailSettingsTable, emailLogsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/rbac";
import { getEmailSettings, sendTestEmail, retryFailedEmail } from "../lib/emailService";
import { renderEmailTemplate } from "../lib/emailTemplates";

const router: IRouter = Router();

// GET /api/email/settings - Admin only
router.get(
  "/email/settings",
  requireAuth,
  requireRole("admin", "management"),
  async (req, res): Promise<void> => {
    const settings = await getEmailSettings();
    // Return settings (mask password for security UI display)
    res.json({
      ...settings,
      smtp_pass: settings.smtp_pass ? "••••••••" : "",
    });
  }
);

// PUT /api/email/settings - Admin only
router.put(
  "/email/settings",
  requireAuth,
  requireRole("admin", "management"),
  async (req, res): Promise<void> => {
    const existing = await getEmailSettings();

    const updates: Partial<typeof emailSettingsTable.$inferInsert> = {
      updated_at: new Date(),
    };

    const fields = [
      "enabled", "provider", "smtp_host", "smtp_port", "smtp_secure",
      "smtp_user", "from_name", "from_email", "reminder_day", "reminder_time",
      "summary_schedule_day", "summary_schedule_time", "timezone", "triggers",
    ] as const;

    for (const f of fields) {
      if (req.body[f] !== undefined) {
        (updates as Record<string, unknown>)[f] = req.body[f];
      }
    }

    // Preserve password if sent masked or empty
    if (req.body.smtp_pass && req.body.smtp_pass !== "••••••••") {
      updates.smtp_pass = req.body.smtp_pass;
    }

    const [updated] = await db
      .update(emailSettingsTable)
      .set(updates)
      .where(eq(emailSettingsTable.id, existing.id))
      .returning();

    res.json({
      ...updated,
      smtp_pass: updated.smtp_pass ? "••••••••" : "",
    });
  }
);

// POST /api/email/test - Send test email
router.post(
  "/email/test",
  requireAuth,
  requireRole("admin", "management"),
  async (req, res): Promise<void> => {
    const { recipientEmail } = req.body;
    if (!recipientEmail) {
      res.status(400).json({ error: "recipientEmail is required" });
      return;
    }

    const result = await sendTestEmail(recipientEmail);
    if (!result.success) {
      res.status(500).json({ error: result.error || "Failed to send test email" });
      return;
    }

    res.json({ success: true, message: `Test email dispatched to ${recipientEmail}` });
  }
);

// GET /api/email/templates/preview - Live HTML preview of email templates
router.get(
  "/email/templates/preview",
  requireAuth,
  requireRole("admin", "management"),
  async (req, res): Promise<void> => {
    const { templateId = "weekly_reminder" } = req.query as { templateId: string };
    const rendered = renderEmailTemplate(templateId, {
      recipientName: "Jane Doe",
      recipientEmail: "jane.doe@ellipsonic.com",
      companyName: "Ellipsonic WCR",
      weekStart: "2026-07-20",
      reportId: "00000000-0000-0000-0000-000000000000",
      reviewerName: "John Smith (Dept Head)",
      comment: "Comprehensive weekly submission. Great progress on the API server refactoring!",
      roleName: "Senior Engineer",
      departmentName: "Engineering",
      activationToken: "sample-activation-token-12345",
      resetLink: "http://localhost:5000/reset-password?token=sample",
      stats: {
        totalEmployees: 42,
        submittedCount: 38,
        approvedCount: 35,
        pendingCount: 3,
        lateCount: 4,
        completionRate: 90,
      },
    });

    res.json(rendered);
  }
);

// GET /api/email/logs - Delivery logs with pagination & filters
router.get(
  "/email/logs",
  requireAuth,
  requireRole("admin", "management"),
  async (req, res): Promise<void> => {
    const {
      page = "1",
      limit = "20",
      search,
      status,
      trigger_event,
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    if (status) conditions.push(eq(emailLogsTable.status, status));
    if (trigger_event) conditions.push(eq(emailLogsTable.trigger_event, trigger_event));
    if (search) {
      conditions.push(
        ilike(emailLogsTable.recipient, `%${search}%`)
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ total }] = await db.select({ total: count() }).from(emailLogsTable).where(where);

    const logs = await db
      .select()
      .from(emailLogsTable)
      .where(where)
      .orderBy(desc(emailLogsTable.created_at))
      .limit(limitNum)
      .offset(offset);

    res.json({
      data: logs.map((l) => ({
        ...l,
        created_at: l.created_at.toISOString(),
        sent_at: l.sent_at ? l.sent_at.toISOString() : null,
      })),
      total: Number(total),
      page: pageNum,
      limit: limitNum,
      total_pages: Math.ceil(Number(total) / limitNum),
    });
  }
);

// POST /api/email/logs/:id/retry - Retry failed email send
router.post(
  "/email/logs/:id/retry",
  requireAuth,
  requireRole("admin", "management"),
  async (req, res): Promise<void> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const result = await retryFailedEmail(id);
    if (!result.success) {
      res.status(500).json({ error: result.error || "Retry failed" });
      return;
    }

    res.json({ success: true, message: "Email re-dispatched successfully" });
  }
);

// GET /api/email/stats - Email dashboard metrics
router.get(
  "/email/stats",
  requireAuth,
  async (req, res): Promise<void> => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [{ sentToday }] = await db
      .select({ sentToday: count() })
      .from(emailLogsTable)
      .where(
        and(
          eq(emailLogsTable.status, "sent"),
          gte(emailLogsTable.created_at, startOfToday)
        )
      );

    const [{ failedCount }] = await db
      .select({ failedCount: count() })
      .from(emailLogsTable)
      .where(eq(emailLogsTable.status, "failed"));

    const [{ pendingCount }] = await db
      .select({ pendingCount: count() })
      .from(emailLogsTable)
      .where(eq(emailLogsTable.status, "pending"));

    const [{ totalCount }] = await db
      .select({ totalCount: count() })
      .from(emailLogsTable);

    const totalNum = Number(totalCount);
    const sentNum = Number(sentToday);
    const failedNum = Number(failedCount);
    const pendingNum = Number(pendingCount);

    const successRate = totalNum > 0
      ? Math.round(((totalNum - failedNum) / totalNum) * 100)
      : 100;

    const recentActivity = await db
      .select()
      .from(emailLogsTable)
      .orderBy(desc(emailLogsTable.created_at))
      .limit(6);

    res.json({
      sent_today: sentNum,
      failed_count: failedNum,
      pending_count: pendingNum,
      total_count: totalNum,
      success_rate: successRate,
      recent_activity: recentActivity.map(a => ({
        ...a,
        created_at: a.created_at.toISOString(),
        sent_at: a.sent_at ? a.sent_at.toISOString() : null,
      })),
    });
  }
);

export default router;
