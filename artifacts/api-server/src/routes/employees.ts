import { Router, type IRouter } from "express";
import { eq, and, isNull, ilike, or, count } from "drizzle-orm";
import { db, employeesTable, departmentsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/rbac";
import { logActivity, logAudit } from "../lib/activityLogger";
import { supabaseAdmin } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/employees", requireAuth, async (req, res): Promise<void> => {
  const {
    search, department_id, role, status, page = "1", limit = "20",
  } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [isNull(employeesTable.deleted_at)];
  if (department_id) conditions.push(eq(employeesTable.department_id, department_id));
  if (role) conditions.push(eq(employeesTable.role, role as "admin" | "department_head" | "employee" | "management"));
  if (status) conditions.push(eq(employeesTable.status, status as "active" | "inactive" | "on_leave"));
  if (search) {
    conditions.push(
      or(
        ilike(employeesTable.name, `%${search}%`),
        ilike(employeesTable.email, `%${search}%`),
        ilike(employeesTable.employee_id, `%${search}%`)
      )!
    );
  }

  const where = and(...conditions);
  const [{ total }] = await db.select({ total: count() }).from(employeesTable).where(where);

  const employees = await db
    .select()
    .from(employeesTable)
    .where(where)
    .orderBy(employeesTable.name)
    .limit(limitNum)
    .offset(offset);

  const enriched = await Promise.all(
    employees.map(async (emp) => {
      let department_name: string | null = null;
      let manager_name: string | null = null;

      if (emp.department_id) {
        const [dept] = await db
          .select({ name: departmentsTable.name })
          .from(departmentsTable)
          .where(eq(departmentsTable.id, emp.department_id))
          .limit(1);
        department_name = dept?.name ?? null;
      }

      if (emp.manager_id) {
        const [mgr] = await db
          .select({ name: employeesTable.name })
          .from(employeesTable)
          .where(eq(employeesTable.id, emp.manager_id))
          .limit(1);
        manager_name = mgr?.name ?? null;
      }

      return {
        ...emp,
        department_name,
        manager_name,
        created_at: emp.created_at.toISOString(),
        updated_at: emp.updated_at.toISOString(),
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
  "/employees",
  requireAuth,
  requireRole("admin", "management"),
  async (req, res): Promise<void> => {
    const {
      name, email, phone, photo_url, department_id, role,
      manager_id, status, joining_date, send_invite,
    } = req.body;

    if (!name || !email || !role) {
      res.status(400).json({ error: "name, email, and role are required" });
      return;
    }

    // Generate employee ID
    const [{ empCount }] = await db
      .select({ empCount: count() })
      .from(employeesTable);
    const employee_id = `EMP${String(Number(empCount) + 1).padStart(4, "0")}`;

    let auth_user_id: string | null = null;

    // Optionally invite user via Supabase
    if (send_invite) {
      try {
        const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);
        if (!error && data.user) {
          auth_user_id = data.user.id;
        }
      } catch {
        // Invite failed, continue without auth user
      }
    }

    const [emp] = await db
      .insert(employeesTable)
      .values({
        employee_id,
        auth_user_id,
        name,
        email,
        phone: phone ?? null,
        photo_url: photo_url ?? null,
        department_id: department_id ?? null,
        role,
        manager_id: manager_id ?? null,
        status: status ?? "active",
        joining_date: joining_date ?? null,
      })
      .returning();

    await Promise.all([
      logActivity({
        user: req.user,
        action: "create",
        entityType: "employee",
        entityId: emp.id,
        description: `${req.user?.name} created employee "${name}"`,
      }),
      logAudit({
        user: req.user,
        tableName: "employees",
        operation: "INSERT",
        recordId: emp.id,
        newValues: { ...emp, auth_user_id: "[redacted]" },
      }),
    ]);

    res.status(201).json({
      ...emp,
      department_name: null,
      manager_name: null,
      created_at: emp.created_at.toISOString(),
      updated_at: emp.updated_at.toISOString(),
    });
  }
);

router.get("/employees/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const [emp] = await db
    .select()
    .from(employeesTable)
    .where(and(eq(employeesTable.id, id), isNull(employeesTable.deleted_at)))
    .limit(1);

  if (!emp) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  let department_name: string | null = null;
  let manager_name: string | null = null;

  if (emp.department_id) {
    const [dept] = await db
      .select({ name: departmentsTable.name })
      .from(departmentsTable)
      .where(eq(departmentsTable.id, emp.department_id))
      .limit(1);
    department_name = dept?.name ?? null;
  }

  if (emp.manager_id) {
    const [mgr] = await db
      .select({ name: employeesTable.name })
      .from(employeesTable)
      .where(eq(employeesTable.id, emp.manager_id))
      .limit(1);
    manager_name = mgr?.name ?? null;
  }

  res.json({
    ...emp,
    department_name,
    manager_name,
    created_at: emp.created_at.toISOString(),
    updated_at: emp.updated_at.toISOString(),
  });
});

router.put(
  "/employees/:id",
  requireAuth,
  requireRole("admin", "management"),
  async (req, res): Promise<void> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const [existing] = await db
      .select()
      .from(employeesTable)
      .where(and(eq(employeesTable.id, id), isNull(employeesTable.deleted_at)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }

    const updates: Record<string, unknown> = { updated_at: new Date() };
    const fields = [
      "name", "phone", "photo_url", "department_id", "role",
      "manager_id", "status", "joining_date",
    ];
    for (const f of fields) {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    }

    const [updated] = await db
      .update(employeesTable)
      .set(updates)
      .where(eq(employeesTable.id, id))
      .returning();

    await Promise.all([
      logActivity({
        user: req.user,
        action: "update",
        entityType: "employee",
        entityId: id,
        description: `${req.user?.name} updated employee "${updated.name}"`,
      }),
      logAudit({
        user: req.user,
        tableName: "employees",
        operation: "UPDATE",
        recordId: id,
        oldValues: { ...existing, auth_user_id: "[redacted]" },
        newValues: { ...updated, auth_user_id: "[redacted]" },
      }),
    ]);

    res.json({
      ...updated,
      department_name: null,
      manager_name: null,
      created_at: updated.created_at.toISOString(),
      updated_at: updated.updated_at.toISOString(),
    });
  }
);

router.delete(
  "/employees/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res): Promise<void> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const [existing] = await db
      .select()
      .from(employeesTable)
      .where(and(eq(employeesTable.id, id), isNull(employeesTable.deleted_at)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }

    await db
      .update(employeesTable)
      .set({ deleted_at: new Date() })
      .where(eq(employeesTable.id, id));

    await Promise.all([
      logActivity({
        user: req.user,
        action: "delete",
        entityType: "employee",
        entityId: id,
        description: `${req.user?.name} deleted employee "${existing.name}"`,
      }),
      logAudit({
        user: req.user,
        tableName: "employees",
        operation: "DELETE",
        recordId: id,
      }),
    ]);

    res.json({ success: true, message: "Employee deleted" });
  }
);

export default router;
