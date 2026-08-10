import { Router, type IRouter } from "express";
import { eq, and, isNull, ilike, or, count, inArray, asc, desc } from "drizzle-orm";
import { db, employeesTable, departmentsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/rbac";
import { logActivity, logAudit } from "../lib/activityLogger";
import { supabaseAdmin } from "../middlewares/auth";
import { createNotification, notifyManagersAndAdmins } from "../lib/notifications";
import { queueEmail } from "../lib/emailService";

const router: IRouter = Router();

router.get("/employees", requireAuth, async (req, res): Promise<void> => {
  const {
    search, department_id, role, status, page = "1", limit = "20",
    sortBy = "name", sortOrder = "asc",
  } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [isNull(employeesTable.deleted_at)];
  if (department_id) conditions.push(eq(employeesTable.department_id, department_id));
  if (role) conditions.push(eq(employeesTable.role, role as "admin" | "department_head" | "employee" | "management"));
  if (status) conditions.push(eq(employeesTable.status, status as "active" | "inactive" | "on_leave" | "resigned"));
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

  // Build sorting and query with left join for department_name
  const employeesQuery = db
    .select({
      id: employeesTable.id,
      employee_id: employeesTable.employee_id,
      auth_user_id: employeesTable.auth_user_id,
      name: employeesTable.name,
      email: employeesTable.email,
      phone: employeesTable.phone,
      photo_url: employeesTable.photo_url,
      department_id: employeesTable.department_id,
      role: employeesTable.role,
      manager_id: employeesTable.manager_id,
      status: employeesTable.status,
      joining_date: employeesTable.joining_date,
      designation: employeesTable.designation,
      employment_type: employeesTable.employment_type,
      timezone: employeesTable.timezone,
      work_location: employeesTable.work_location,
      weekly_reporting_frequency: employeesTable.weekly_reporting_frequency,
      created_at: employeesTable.created_at,
      updated_at: employeesTable.updated_at,
      department_name: departmentsTable.name,
    })
    .from(employeesTable)
    .leftJoin(departmentsTable, eq(employeesTable.department_id, departmentsTable.id))
    .where(where);

  const dir = sortOrder === "desc" ? desc : asc;
  let orderByClause;
  if (sortBy === "department_name") {
    orderByClause = dir(departmentsTable.name);
  } else if (sortBy === "employee_id") {
    orderByClause = dir(employeesTable.employee_id);
  } else if (sortBy === "role") {
    orderByClause = dir(employeesTable.role);
  } else if (sortBy === "status") {
    orderByClause = dir(employeesTable.status);
  } else if (sortBy === "joining_date") {
    orderByClause = dir(employeesTable.joining_date);
  } else {
    orderByClause = dir(employeesTable.name);
  }

  const employees = await employeesQuery
    .orderBy(orderByClause)
    .limit(limitNum)
    .offset(offset);

  const managerIds = employees.map(e => e.manager_id).filter((id): id is string => !!id);
  const managerMap = new Map<string, string>();

  if (managerIds.length > 0) {
    const managers = await db
      .select({ id: employeesTable.id, name: employeesTable.name })
      .from(employeesTable)
      .where(inArray(employeesTable.id, managerIds));
    managers.forEach(m => managerMap.set(m.id, m.name));
  }

  const enriched = employees.map((emp) => ({
    ...emp,
    manager_name: emp.manager_id ? (managerMap.get(emp.manager_id) ?? null) : null,
    created_at: emp.created_at.toISOString(),
    updated_at: emp.updated_at.toISOString(),
  }));

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
      designation, employment_type, timezone, work_location,
      weekly_reporting_frequency,
    } = req.body;

    if (!name || !email || !role) {
      res.status(400).json({ error: "name, email, and role are required" });
      return;
    }

    // Verify email uniqueness
    const [exists] = await db
      .select({ id: employeesTable.id })
      .from(employeesTable)
      .where(eq(employeesTable.email, email))
      .limit(1);

    if (exists) {
      res.status(400).json({ error: "An employee with this email already exists" });
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
        designation: designation ?? null,
        employment_type: employment_type ?? null,
        timezone: timezone ?? null,
        work_location: work_location ?? null,
        weekly_reporting_frequency: weekly_reporting_frequency ?? null,
      })
      .returning();

    await Promise.all([
      createNotification({
        userId: emp.id,
        type: "announcement",
        title: "Welcome to Ellipsonic OpsHub!",
        message: "Your profile has been successfully created. Welcome aboard!",
      }),
      emp.manager_id
        ? createNotification({
            userId: emp.manager_id,
            type: "announcement",
            title: "New Team Member",
            message: `${emp.name} has been added as your direct report.`,
          })
        : Promise.resolve(),
      notifyManagersAndAdmins({
        type: "announcement",
        title: "New Employee Created",
        message: `A new employee profile has been created for ${emp.name} (${emp.email}).`,
        entityType: "employee",
        entityId: emp.id,
      }),
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

    queueEmail({
      recipientEmail: emp.email,
      recipientName: emp.name,
      triggerEvent: "welcome_email",
      templateData: {
        recipientName: emp.name,
        recipientEmail: emp.email,
        roleName: emp.role,
      },
    });

    res.status(201).json({
      ...emp,
      department_name: null,
      manager_name: null,
      created_at: emp.created_at.toISOString(),
      updated_at: emp.updated_at.toISOString(),
    });
  }
);

router.post(
  "/employees/import",
  requireAuth,
  requireRole("admin", "management"),
  async (req, res): Promise<void> => {
    const { csvData } = req.body;
    if (!csvData) {
      res.status(400).json({ error: "csvData is required" });
      return;
    }

    const lines = csvData.split(/\r?\n/).filter((l: string) => l.trim() !== "");
    if (lines.length <= 1) {
      res.status(400).json({ error: "CSV has no data rows" });
      return;
    }

    const headers = lines[0].split(",").map((h: string) => h.trim().replace(/^["']|["']$/g, ""));
    let importedCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(",").map((v: string) => v.trim().replace(/^["']|["']$/g, ""));
      if (row.length === 0 || !row[0]) continue;

      const data: Record<string, string> = {};
      headers.forEach((header: string, index: number) => {
        data[header] = row[index];
      });

      const {
        name, email, role, status, phone, designation, employment_type,
        timezone, work_location, weekly_reporting_frequency, joining_date,
      } = data;

      if (!name || !email || !role) continue;

      // Skip duplicates
      const [exists] = await db
        .select({ id: employeesTable.id })
        .from(employeesTable)
        .where(eq(employeesTable.email, email))
        .limit(1);

      if (exists) continue;

      const [{ empCount }] = await db
        .select({ empCount: count() })
        .from(employeesTable);
      const employee_id = `EMP${String(Number(empCount) + 1).padStart(4, "0")}`;

      await db.insert(employeesTable).values({
        employee_id,
        name,
        email,
        role: (role.toLowerCase() as any) ?? "employee",
        status: (status?.toLowerCase() as any) ?? "active",
        phone: phone || null,
        joining_date: joining_date || null,
        designation: designation || null,
        employment_type: employment_type || null,
        timezone: timezone || null,
        work_location: work_location || null,
        weekly_reporting_frequency: weekly_reporting_frequency ? parseInt(weekly_reporting_frequency) : null,
      });

      importedCount++;
    }

    res.json({
      success: true,
      count: importedCount,
      message: `Successfully imported ${importedCount} employees.`,
    });
  }
);

router.get(
  "/employees/export",
  requireAuth,
  requireRole("admin", "management"),
  async (req, res): Promise<void> => {
    const employees = await db
      .select()
      .from(employeesTable)
      .where(isNull(employeesTable.deleted_at));

    const headers = [
      "name", "email", "employee_id", "phone", "role", "status",
      "joining_date", "designation", "employment_type", "timezone",
      "work_location", "weekly_reporting_frequency"
    ];

    const csvRows = [headers.join(",")];
    for (const emp of employees) {
      const values = headers.map(header => {
        const val = (emp as any)[header] ?? "";
        const escaped = String(val).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(","));
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=employees.csv");
    res.status(200).send(csvRows.join("\n"));
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
      "designation", "employment_type", "timezone", "work_location",
      "weekly_reporting_frequency",
    ];
    for (const f of fields) {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    }

    const [updated] = await db
      .update(employeesTable)
      .set(updates)
      .where(eq(employeesTable.id, id))
      .returning();

    // Trigger notifications for modifications
    const notifPromises: Promise<any>[] = [];

    if (existing.status !== updated.status) {
      notifPromises.push(
        createNotification({
          userId: updated.id,
          type: "announcement",
          title: "Account Status Updated",
          message: `Your profile status has been changed from "${existing.status}" to "${updated.status}".`,
        })
      );
      notifPromises.push(
        notifyManagersAndAdmins({
          type: "announcement",
          title: "Employee Status Changed",
          message: `Employee ${updated.name}'s status was changed from "${existing.status}" to "${updated.status}".`,
          entityType: "employee",
          entityId: updated.id,
        })
      );
    }

    if (existing.department_id !== updated.department_id) {
      notifPromises.push(
        (async () => {
          let deptName = "None";
          if (updated.department_id) {
            const [d] = await db
              .select({ name: departmentsTable.name })
              .from(departmentsTable)
              .where(eq(departmentsTable.id, updated.department_id))
              .limit(1);
            if (d) deptName = d.name;
          }
          await Promise.all([
            createNotification({
              userId: updated.id,
              type: "announcement",
              title: "Department Reassigned",
              message: `You have been reassigned to the department: "${deptName}".`,
            }),
            notifyManagersAndAdmins({
              type: "announcement",
              title: "Employee Department Reassigned",
              message: `Employee ${updated.name} has been reassigned to department "${deptName}".`,
              entityType: "employee",
              entityId: updated.id,
            })
          ]);
          queueEmail({
            recipientEmail: updated.email,
            recipientName: updated.name,
            triggerEvent: "department_transfer",
            templateData: {
              recipientName: updated.name,
              departmentName: deptName,
            },
          });
        })()
      );
    }

    if (existing.role !== updated.role) {
      notifPromises.push(
        createNotification({
          userId: updated.id,
          type: "announcement",
          title: "Role Updated",
          message: `Your access role has been updated from "${existing.role}" to "${updated.role}".`,
        })
      );
      notifPromises.push(
        notifyManagersAndAdmins({
          type: "announcement",
          title: "Employee Role Changed",
          message: `Employee ${updated.name}'s role was updated from "${existing.role}" to "${updated.role}".`,
          entityType: "employee",
          entityId: updated.id,
        })
      );
      queueEmail({
        recipientEmail: updated.email,
        recipientName: updated.name,
        triggerEvent: "role_update",
        templateData: {
          recipientName: updated.name,
          roleName: updated.role,
        },
      });
    }

    await Promise.all([
      ...notifPromises,
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
    const permanent = req.query.permanent === "true";

    const [existing] = await db
      .select()
      .from(employeesTable)
      .where(and(eq(employeesTable.id, id), isNull(employeesTable.deleted_at)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }

    if (permanent) {
      await db.delete(employeesTable).where(eq(employeesTable.id, id));
    } else {
      await db
        .update(employeesTable)
        .set({ deleted_at: new Date() })
        .where(eq(employeesTable.id, id));
    }

    await Promise.all([
      logActivity({
        user: req.user,
        action: permanent ? "hard_delete" : "delete",
        entityType: "employee",
        entityId: id,
        description: `${req.user?.name} ${permanent ? "permanently" : ""} deleted employee "${existing.name}"`,
      }),
      logAudit({
        user: req.user,
        tableName: "employees",
        operation: "DELETE",
        recordId: id,
        oldValues: existing,
      }),
    ]);

    res.json({
      success: true,
      message: `Employee ${permanent ? "permanently" : "soft"} deleted`,
    });
  }
);

export default router;
