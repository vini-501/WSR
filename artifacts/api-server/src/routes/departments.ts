import { Router, type IRouter } from "express";
import { eq, and, isNull, ilike, sql, count } from "drizzle-orm";
import {
  db,
  departmentsTable,
  employeesTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/rbac";
import { logActivity, logAudit } from "../lib/activityLogger";

const router: IRouter = Router();

router.get("/departments", requireAuth, async (req, res): Promise<void> => {
  const { search, status, page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [isNull(departmentsTable.deleted_at)];
  if (status) conditions.push(eq(departmentsTable.status, status as "active" | "inactive"));
  if (search) conditions.push(ilike(departmentsTable.name, `%${search}%`));

  const where = and(...conditions);

  const [{ total }] = await db
    .select({ total: count() })
    .from(departmentsTable)
    .where(where);

  const depts = await db
    .select()
    .from(departmentsTable)
    .where(where)
    .orderBy(departmentsTable.name)
    .limit(limitNum)
    .offset(offset);

  // Fetch head names and employee counts
  const enriched = await Promise.all(
    depts.map(async (dept) => {
      let head_name: string | null = null;
      if (dept.head_id) {
        const [head] = await db
          .select({ name: employeesTable.name })
          .from(employeesTable)
          .where(eq(employeesTable.id, dept.head_id))
          .limit(1);
        head_name = head?.name ?? null;
      }

      const [{ empCount }] = await db
        .select({ empCount: count() })
        .from(employeesTable)
        .where(
          and(
            eq(employeesTable.department_id, dept.id),
            isNull(employeesTable.deleted_at)
          )
        );

      return {
        ...dept,
        head_name,
        employee_count: Number(empCount),
        created_at: dept.created_at.toISOString(),
        updated_at: dept.updated_at.toISOString(),
      };
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

router.post(
  "/departments",
  requireAuth,
  requireRole("admin", "management"),
  async (req, res): Promise<void> => {
    const {
      name, description, head_id, status, reporting_frequency,
      reminder_day, reminder_time, submission_deadline, automation_source, recipients,
    } = req.body;

    if (!name || !reporting_frequency) {
      res.status(400).json({ error: "name and reporting_frequency are required" });
      return;
    }

    const [dept] = await db
      .insert(departmentsTable)
      .values({
        name,
        description: description ?? null,
        head_id: head_id ?? null,
        status: status ?? "active",
        reporting_frequency,
        reminder_day: reminder_day ?? null,
        reminder_time: reminder_time ?? null,
        submission_deadline: submission_deadline ?? null,
        automation_source: automation_source ?? null,
        recipients: recipients ?? [],
      })
      .returning();

    await Promise.all([
      logActivity({
        user: req.user,
        action: "create",
        entityType: "department",
        entityId: dept.id,
        description: `${req.user?.name} created department "${name}"`,
      }),
      logAudit({
        user: req.user,
        tableName: "departments",
        operation: "INSERT",
        recordId: dept.id,
        newValues: dept,
      }),
    ]);

    res.status(201).json({
      ...dept,
      head_name: null,
      employee_count: 0,
      created_at: dept.created_at.toISOString(),
      updated_at: dept.updated_at.toISOString(),
    });
  }
);

router.get("/departments/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const [dept] = await db
    .select()
    .from(departmentsTable)
    .where(and(eq(departmentsTable.id, id), isNull(departmentsTable.deleted_at)))
    .limit(1);

  if (!dept) {
    res.status(404).json({ error: "Department not found" });
    return;
  }

  let head_name: string | null = null;
  if (dept.head_id) {
    const [head] = await db
      .select({ name: employeesTable.name })
      .from(employeesTable)
      .where(eq(employeesTable.id, dept.head_id))
      .limit(1);
    head_name = head?.name ?? null;
  }

  const [{ empCount }] = await db
    .select({ empCount: count() })
    .from(employeesTable)
    .where(
      and(eq(employeesTable.department_id, id), isNull(employeesTable.deleted_at))
    );

  res.json({
    ...dept,
    head_name,
    employee_count: Number(empCount),
    created_at: dept.created_at.toISOString(),
    updated_at: dept.updated_at.toISOString(),
  });
});

router.put(
  "/departments/:id",
  requireAuth,
  requireRole("admin", "management"),
  async (req, res): Promise<void> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const [existing] = await db
      .select()
      .from(departmentsTable)
      .where(and(eq(departmentsTable.id, id), isNull(departmentsTable.deleted_at)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Department not found" });
      return;
    }

    const updates: Partial<typeof departmentsTable.$inferInsert> = { updated_at: new Date() };
    const fields = [
      "name", "description", "head_id", "status", "reporting_frequency",
      "reminder_day", "reminder_time", "submission_deadline", "automation_source", "recipients",
    ] as const;
    for (const f of fields) {
      if (req.body[f] !== undefined) (updates as Record<string, unknown>)[f] = req.body[f];
    }

    const [updated] = await db
      .update(departmentsTable)
      .set(updates)
      .where(eq(departmentsTable.id, id))
      .returning();

    await Promise.all([
      logActivity({
        user: req.user,
        action: "update",
        entityType: "department",
        entityId: id,
        description: `${req.user?.name} updated department "${updated.name}"`,
      }),
      logAudit({
        user: req.user,
        tableName: "departments",
        operation: "UPDATE",
        recordId: id,
        oldValues: existing,
        newValues: updated,
      }),
    ]);

    res.json({
      ...updated,
      head_name: null,
      employee_count: 0,
      created_at: updated.created_at.toISOString(),
      updated_at: updated.updated_at.toISOString(),
    });
  }
);

router.delete(
  "/departments/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res): Promise<void> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const [existing] = await db
      .select()
      .from(departmentsTable)
      .where(and(eq(departmentsTable.id, id), isNull(departmentsTable.deleted_at)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Department not found" });
      return;
    }

    await db
      .update(departmentsTable)
      .set({ deleted_at: new Date() })
      .where(eq(departmentsTable.id, id));

    await Promise.all([
      logActivity({
        user: req.user,
        action: "delete",
        entityType: "department",
        entityId: id,
        description: `${req.user?.name} deleted department "${existing.name}"`,
      }),
      logAudit({
        user: req.user,
        tableName: "departments",
        operation: "DELETE",
        recordId: id,
        oldValues: existing,
      }),
    ]);

    res.json({ success: true, message: "Department deleted" });
  }
);

export default router;
