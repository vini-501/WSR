import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, employeesTable, departmentsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { logActivity } from "../lib/activityLogger";

const router: IRouter = Router();

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;

  // Fetch department name if user has a department
  let department_name: string | null = null;
  if (user.department_id) {
    const [dept] = await db
      .select({ name: departmentsTable.name })
      .from(departmentsTable)
      .where(eq(departmentsTable.id, user.department_id))
      .limit(1);
    department_name = dept?.name ?? null;
  }

  res.json({
    id: user.id,
    auth_user_id: user.auth_user_id,
    employee_id: user.employee_id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    photo_url: user.photo_url,
    role: user.role,
    department_id: user.department_id,
    department_name,
    status: user.status,
    joining_date: user.joining_date,
    created_at: user.created_at.toISOString(),
  });
});

router.put("/auth/profile", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const { name, phone, photo_url } = req.body;

  const updates: Partial<typeof employeesTable.$inferSelect> = {
    updated_at: new Date(),
  };
  if (name) updates.name = name;
  if (phone !== undefined) updates.phone = phone;
  if (photo_url !== undefined) updates.photo_url = photo_url;

  const [updated] = await db
    .update(employeesTable)
    .set(updates)
    .where(eq(employeesTable.id, user.id))
    .returning();

  await logActivity({
    user,
    action: "update",
    entityType: "employee",
    entityId: user.id,
    description: `${user.name} updated their profile`,
  });

  let department_name: string | null = null;
  if (updated.department_id) {
    const [dept] = await db
      .select({ name: departmentsTable.name })
      .from(departmentsTable)
      .where(eq(departmentsTable.id, updated.department_id))
      .limit(1);
    department_name = dept?.name ?? null;
  }

  res.json({
    id: updated.id,
    auth_user_id: updated.auth_user_id,
    employee_id: updated.employee_id,
    name: updated.name,
    email: updated.email,
    phone: updated.phone,
    photo_url: updated.photo_url,
    role: updated.role,
    department_id: updated.department_id,
    department_name,
    status: updated.status,
    joining_date: updated.joining_date,
    created_at: updated.created_at.toISOString(),
  });
});

export default router;
