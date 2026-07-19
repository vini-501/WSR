import { Router, type IRouter } from "express";
import { db, companySettingsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { ADMIN_ONLY } from "../middlewares/rbac";
import { logActivity } from "../lib/activityLogger";

const router: IRouter = Router();

async function getOrCreateSettings() {
  let [settings] = await db.select().from(companySettingsTable).limit(1);
  if (!settings) {
    [settings] = await db.insert(companySettingsTable).values({}).returning();
  }
  return settings;
}

router.get("/settings", requireAuth, async (req, res): Promise<void> => {
  const settings = await getOrCreateSettings();
  res.json({
    ...settings,
    created_at: settings.created_at.toISOString(),
    updated_at: settings.updated_at.toISOString(),
  });
});

router.put("/settings", requireAuth, ADMIN_ONLY, async (req, res): Promise<void> => {
  const settings = await getOrCreateSettings();

  const updates: Record<string, unknown> = { updated_at: new Date() };
  const fields = [
    "company_name", "logo_url", "timezone", "reporting_deadline_day",
    "reporting_deadline_time", "theme", "allow_late_submissions",
    "require_manager_approval", "notification_enabled",
  ];
  for (const f of fields) {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  }

  const { eq } = await import("drizzle-orm");
  const [updated] = await db
    .update(companySettingsTable)
    .set(updates)
    .where(eq(companySettingsTable.id, settings.id))
    .returning();

  await logActivity({
    user: req.user,
    action: "update",
    entityType: "settings",
    entityId: settings.id,
    description: `${req.user?.name} updated company settings`,
  });

  res.json({
    ...updated,
    created_at: updated.created_at.toISOString(),
    updated_at: updated.updated_at.toISOString(),
  });
});

export default router;
