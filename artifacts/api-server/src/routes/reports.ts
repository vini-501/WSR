import { Router, type IRouter } from "express";
import {
  eq, and, isNull, ilike, count, desc, or, inArray,
} from "drizzle-orm";
import {
  db, weeklyReportsTable, employeesTable, departmentsTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/rbac";
import { logActivity, logAudit } from "../lib/activityLogger";
import { createNotification, notifyRole, notifyDepartmentHeads, notifyManagersAndAdmins, notifyAll } from "../lib/notifications";
import { queueEmail } from "../lib/emailService";

const router: IRouter = Router();

function formatReport(r: typeof weeklyReportsTable.$inferSelect, employee_name: string, employee_photo: string | null, department_name: string | null, reviewer_name: string | null) {
  return {
    id: r.id,
    employee_id: r.employee_id,
    employee_name,
    employee_photo,
    department_id: r.department_id,
    department_name,
    week_start: r.week_start,
    achievements: r.achievements,
    completed_tasks: r.completed_tasks,
    ongoing_tasks: r.ongoing_tasks,
    blockers: r.blockers,
    next_week_plans: r.next_week_plans,
    support_needed: r.support_needed,
    additional_notes: r.additional_notes,
    overall_progress: r.overall_progress,
    status: r.status,
    reviewer_id: r.reviewer_id,
    reviewer_name,
    review_comment: r.review_comment,
    reviewed_at: r.reviewed_at?.toISOString() ?? null,
    submitted_at: r.submitted_at?.toISOString() ?? null,
    created_at: r.created_at.toISOString(),
    updated_at: r.updated_at.toISOString(),
  };
}

async function checkWeeklyReportsCompletion(weekStart: string) {
  try {
    const [{ activeCount }] = await db
      .select({ activeCount: count() })
      .from(employeesTable)
      .where(
        and(
          eq(employeesTable.status, "active"),
          isNull(employeesTable.deleted_at)
        )
      );

    const [{ approvedCount }] = await db
      .select({ approvedCount: count() })
      .from(weeklyReportsTable)
      .where(
        and(
          eq(weeklyReportsTable.week_start, weekStart),
          eq(weeklyReportsTable.status, "approved"),
          isNull(weeklyReportsTable.deleted_at)
        )
      );

    if (Number(activeCount) > 0 && Number(approvedCount) >= Number(activeCount)) {
      await notifyManagersAndAdmins({
        type: "approval",
        title: "All WCR Reports Completed",
        message: `All active employees have submitted and had their reports approved for the week of ${weekStart}.`,
        entityType: "report",
      });

      const adminsAndManagers = await db
        .select({ email: employeesTable.email, name: employeesTable.name })
        .from(employeesTable)
        .where(
          and(
            or(eq(employeesTable.role, "admin"), eq(employeesTable.role, "management")),
            eq(employeesTable.status, "active"),
            isNull(employeesTable.deleted_at)
          )
        );

      for (const mgr of adminsAndManagers) {
        queueEmail({
          recipientEmail: mgr.email,
          recipientName: mgr.name,
          triggerEvent: "executive_summary",
          templateData: {
            recipientName: mgr.name,
            weekStart,
            stats: {
              totalEmployees: Number(activeCount),
              submittedCount: Number(approvedCount),
              approvedCount: Number(approvedCount),
              pendingCount: 0,
              completionRate: 100,
            },
          },
        });
      }
    }
  } catch (err) {
    console.error("Error checking weekly report completion:", err);
  }
}

async function enrichReport(r: typeof weeklyReportsTable.$inferSelect) {
  const [emp] = await db
    .select({ name: employeesTable.name, photo_url: employeesTable.photo_url })
    .from(employeesTable)
    .where(eq(employeesTable.id, r.employee_id))
    .limit(1);

  let department_name: string | null = null;
  if (r.department_id) {
    const [dept] = await db
      .select({ name: departmentsTable.name })
      .from(departmentsTable)
      .where(eq(departmentsTable.id, r.department_id))
      .limit(1);
    department_name = dept?.name ?? null;
  }

  let reviewer_name: string | null = null;
  if (r.reviewer_id) {
    const [rev] = await db
      .select({ name: employeesTable.name })
      .from(employeesTable)
      .where(eq(employeesTable.id, r.reviewer_id))
      .limit(1);
    reviewer_name = rev?.name ?? null;
  }

  return formatReport(r, emp?.name ?? "Unknown", emp?.photo_url ?? null, department_name, reviewer_name);
}

router.get("/reports", requireAuth, async (req, res): Promise<void> => {
  const {
    search, department_id, employee_id, status, week_start,
    page = "1", limit = "20",
  } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [isNull(weeklyReportsTable.deleted_at)];

  // Employees can only see their own reports
  if (req.user?.role === "employee") {
    conditions.push(eq(weeklyReportsTable.employee_id, req.user.id));
  } else if (req.user?.role === "department_head" && req.user.department_id) {
    conditions.push(eq(weeklyReportsTable.department_id, req.user.department_id));
  }

  // UUID validation helper — ignore sentinel values like "all", "none", etc.
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (employee_id && UUID_RE.test(employee_id)) conditions.push(eq(weeklyReportsTable.employee_id, employee_id));
  if (department_id && UUID_RE.test(department_id)) conditions.push(eq(weeklyReportsTable.department_id, department_id));
  if (status) conditions.push(eq(weeklyReportsTable.status, status as any));
  if (week_start) conditions.push(eq(weeklyReportsTable.week_start, week_start));

  const where = and(...conditions);
  const [{ total }] = await db.select({ total: count() }).from(weeklyReportsTable).where(where);

  const reports = await db
    .select()
    .from(weeklyReportsTable)
    .where(where)
    .orderBy(desc(weeklyReportsTable.created_at))
    .limit(limitNum)
    .offset(offset);

  const empIds = Array.from(new Set(reports.map(r => r.employee_id)));
  const deptIds = Array.from(new Set(reports.map(r => r.department_id).filter((id): id is string => !!id)));
  const revIds = Array.from(new Set(reports.map(r => r.reviewer_id).filter((id): id is string => !!id)));

  const empMap = new Map<string, { name: string; photo_url: string | null }>();
  const deptMap = new Map<string, string>();
  const revMap = new Map<string, string>();

  if (empIds.length > 0) {
    const emps = await db
      .select({ id: employeesTable.id, name: employeesTable.name, photo_url: employeesTable.photo_url })
      .from(employeesTable)
      .where(inArray(employeesTable.id, empIds));
    emps.forEach(e => empMap.set(e.id, e));
  }

  if (deptIds.length > 0) {
    const depts = await db
      .select({ id: departmentsTable.id, name: departmentsTable.name })
      .from(departmentsTable)
      .where(inArray(departmentsTable.id, deptIds));
    depts.forEach(d => deptMap.set(d.id, d.name));
  }

  if (revIds.length > 0) {
    const reviewers = await db
      .select({ id: employeesTable.id, name: employeesTable.name })
      .from(employeesTable)
      .where(inArray(employeesTable.id, revIds));
    reviewers.forEach(r => revMap.set(r.id, r.name));
  }

  const enriched = reports.map((r) => {
    const emp = empMap.get(r.employee_id);
    const deptName = r.department_id ? (deptMap.get(r.department_id) ?? null) : null;
    const revName = r.reviewer_id ? (revMap.get(r.reviewer_id) ?? null) : null;
    return formatReport(r, emp?.name ?? "Unknown", emp?.photo_url ?? null, deptName, revName);
  });

  res.json({
    data: enriched,
    total: Number(total),
    page: pageNum,
    limit: limitNum,
    total_pages: Math.ceil(Number(total) / limitNum),
  });
});

router.post("/reports", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const { week_start, achievements, completed_tasks, ongoing_tasks, blockers, next_week_plans, support_needed, additional_notes, overall_progress } = req.body;

  if (!week_start || !achievements || !completed_tasks || !ongoing_tasks || !next_week_plans) {
    res.status(400).json({ error: "week_start, achievements, completed_tasks, ongoing_tasks, and next_week_plans are required" });
    return;
  }

  const [report] = await db
    .insert(weeklyReportsTable)
    .values({
      employee_id: user.id,
      department_id: user.department_id ?? null,
      week_start,
      achievements,
      completed_tasks,
      ongoing_tasks,
      blockers: blockers ?? null,
      next_week_plans,
      support_needed: support_needed ?? null,
      additional_notes: additional_notes ?? null,
      overall_progress: overall_progress ?? 0,
      status: "draft",
    })
    .returning();

  await Promise.all([
    logActivity({
      user,
      action: "create",
      entityType: "report",
      entityId: report.id,
      description: `${user.name} created a draft report for week of ${week_start}`,
    }),
    createNotification({
      userId: user.id,
      type: "reminder",
      title: "Draft Report Saved",
      message: `Your report for the week of ${week_start} has been saved as a draft.`,
      entityType: "report",
      entityId: report.id,
    }),
  ]);

  res.status(201).json(await enrichReport(report));
});

router.get("/reports/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const [report] = await db
    .select()
    .from(weeklyReportsTable)
    .where(and(eq(weeklyReportsTable.id, id), isNull(weeklyReportsTable.deleted_at)))
    .limit(1);

  if (!report) {
    res.status(404).json({ error: "Report not found" });
    return;
  }

  // Access control
  if (req.user?.role === "employee" && report.employee_id !== req.user.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  res.json(await enrichReport(report));
});

router.put("/reports/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const user = req.user!;

  const [existing] = await db
    .select()
    .from(weeklyReportsTable)
    .where(and(eq(weeklyReportsTable.id, id), isNull(weeklyReportsTable.deleted_at)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Report not found" });
    return;
  }

  if (existing.employee_id !== user.id && user.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  if (!["draft", "needs_changes"].includes(existing.status)) {
    res.status(400).json({ error: "Only draft or needs_changes reports can be edited" });
    return;
  }

  const updates: Record<string, unknown> = { updated_at: new Date() };
  for (const f of ["achievements", "completed_tasks", "ongoing_tasks", "blockers", "next_week_plans", "support_needed", "additional_notes", "overall_progress"]) {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  }

  const [updated] = await db
    .update(weeklyReportsTable)
    .set(updates)
    .where(eq(weeklyReportsTable.id, id))
    .returning();

  await createNotification({
    userId: user.id,
    type: "reminder",
    title: "Report Updated",
    message: `Your report for the week of ${updated.week_start} has been successfully updated.`,
    entityType: "report",
    entityId: id,
  });

  res.json(await enrichReport(updated));
});

router.delete("/reports/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const user = req.user!;

  const [existing] = await db
    .select()
    .from(weeklyReportsTable)
    .where(and(eq(weeklyReportsTable.id, id), isNull(weeklyReportsTable.deleted_at)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Report not found" });
    return;
  }

  if (existing.employee_id !== user.id && user.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  if (existing.status !== "draft") {
    res.status(400).json({ error: "Only draft reports can be deleted" });
    return;
  }

  await db.update(weeklyReportsTable).set({ deleted_at: new Date() }).where(eq(weeklyReportsTable.id, id));
  res.json({ success: true, message: "Report deleted" });
});

router.post("/reports/:id/submit", requireAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const user = req.user!;

  const [report] = await db
    .select()
    .from(weeklyReportsTable)
    .where(and(eq(weeklyReportsTable.id, id), isNull(weeklyReportsTable.deleted_at)))
    .limit(1);

  if (!report) {
    res.status(404).json({ error: "Report not found" });
    return;
  }

  if (report.employee_id !== user.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  if (!["draft", "needs_changes"].includes(report.status)) {
    res.status(400).json({ error: "Report cannot be submitted in its current state" });
    return;
  }

  const isResubmission = report.status === "needs_changes";

  const [updated] = await db
    .update(weeklyReportsTable)
    .set({ status: "submitted", submitted_at: new Date(), updated_at: new Date() })
    .where(eq(weeklyReportsTable.id, id))
    .returning();

  const activityPromise = logActivity({
    user,
    action: isResubmission ? "resubmit" : "submit",
    entityType: "report",
    entityId: id,
    description: `${user.name} ${isResubmission ? "resubmitted" : "submitted"} report for week of ${report.week_start}`,
  });

  const employeeNotifPromise = createNotification({
    userId: user.id,
    type: "approval",
    title: isResubmission ? "Report Resubmitted Successfully" : "Report Submitted Successfully",
    message: isResubmission
      ? `Your report for the week of ${report.week_start} has been resubmitted successfully.`
      : `Your report for the week of ${report.week_start} has been submitted successfully.`,
    entityType: "report",
    entityId: id,
  });

  const deptHeadNotifPromise = (async () => {
    if (user.department_id) {
      await notifyDepartmentHeads(user.department_id, {
        type: "approval",
        title: isResubmission ? "Report Resubmitted" : "New Report Submitted",
        message: `${user.name} has ${isResubmission ? "resubmitted" : "submitted"} a weekly report for review`,
        entityType: "report",
        entityId: id,
      });

      const [dept] = await db
        .select({ head_id: departmentsTable.head_id })
        .from(departmentsTable)
        .where(eq(departmentsTable.id, user.department_id))
        .limit(1);

      if (dept?.head_id && dept.head_id !== user.id) {
        await createNotification({
          userId: dept.head_id,
          type: "approval",
          title: isResubmission ? "Report Resubmitted" : "New Report Submitted",
          message: `${user.name} has ${isResubmission ? "resubmitted" : "submitted"} a weekly report for review`,
          entityType: "report",
          entityId: id,
        });
      }
    }
  })();

  await Promise.all([activityPromise, employeeNotifPromise, deptHeadNotifPromise]);

  queueEmail({
    recipientEmail: user.email,
    recipientName: user.name,
    triggerEvent: isResubmission ? "report_resubmitted" : "submission_confirmation",
    templateData: {
      recipientName: user.name,
      weekStart: report.week_start,
      reportId: id,
    },
  });

  const deptId = user.department_id;
  if (deptId) {
    (async () => {
      const heads = await db
        .select({ email: employeesTable.email, name: employeesTable.name })
        .from(employeesTable)
        .where(
          and(
            eq(employeesTable.department_id, deptId),
            eq(employeesTable.role, "department_head"),
            eq(employeesTable.status, "active"),
            isNull(employeesTable.deleted_at)
          )
        );

      for (const head of heads) {
        if (head.email !== user.email) {
          queueEmail({
            recipientEmail: head.email,
            recipientName: head.name,
            triggerEvent: "dept_head_review",
            templateData: {
              recipientName: head.name,
              weekStart: report.week_start,
              reportId: id,
            },
          });
        }
      }
    })().catch(err => console.error("Error queueing dept head emails:", err));
  }

  res.json(await enrichReport(updated));
});

router.post(
  "/reports/:id/approve",
  requireAuth,
  requireRole("admin", "management", "department_head"),
  async (req, res): Promise<void> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = req.user!;

    const [report] = await db
      .select()
      .from(weeklyReportsTable)
      .where(and(eq(weeklyReportsTable.id, id), isNull(weeklyReportsTable.deleted_at)))
      .limit(1);

    if (!report) {
      res.status(404).json({ error: "Report not found" });
      return;
    }

    if (!["submitted", "under_review"].includes(report.status)) {
      res.status(400).json({ error: "Only submitted or under review reports can be approved" });
      return;
    }

    const [updated] = await db
      .update(weeklyReportsTable)
      .set({
        status: "approved",
        reviewer_id: user.id,
        review_comment: req.body.comment ?? null,
        reviewed_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(weeklyReportsTable.id, id))
      .returning();

    await Promise.all([
      logActivity({
        user,
        action: "approve",
        entityType: "report",
        entityId: id,
        description: `${user.name} approved report by employee ID ${report.employee_id}`,
      }),
      createNotification({
        userId: report.employee_id,
        type: "approval",
        title: "Report Approved",
        message: `Your weekly report has been approved${req.body.comment ? `: "${req.body.comment}"` : ""}`,
        entityType: "report",
        entityId: id,
      }),
    ]);

    (async () => {
      const [emp] = await db
        .select({ email: employeesTable.email, name: employeesTable.name })
        .from(employeesTable)
        .where(eq(employeesTable.id, report.employee_id))
        .limit(1);
      if (emp) {
        queueEmail({
          recipientEmail: emp.email,
          recipientName: emp.name,
          triggerEvent: "report_approved",
          templateData: {
            recipientName: emp.name,
            weekStart: report.week_start,
            reportId: id,
            reviewerName: user.name,
            comment: req.body.comment ?? undefined,
          },
        });
      }
    })().catch(err => console.error("Error queueing approval email:", err));

    await checkWeeklyReportsCompletion(report.week_start);

    res.json(await enrichReport(updated));
  }
);

router.post(
  "/reports/:id/reject",
  requireAuth,
  requireRole("admin", "management", "department_head"),
  async (req, res): Promise<void> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = req.user!;

    const [report] = await db
      .select()
      .from(weeklyReportsTable)
      .where(and(eq(weeklyReportsTable.id, id), isNull(weeklyReportsTable.deleted_at)))
      .limit(1);

    if (!report) {
      res.status(404).json({ error: "Report not found" });
      return;
    }

    if (!["submitted", "under_review"].includes(report.status)) {
      res.status(400).json({ error: "Only submitted or under review reports can be rejected" });
      return;
    }

    const [updated] = await db
      .update(weeklyReportsTable)
      .set({
        status: "rejected",
        reviewer_id: user.id,
        review_comment: req.body.comment ?? null,
        reviewed_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(weeklyReportsTable.id, id))
      .returning();

    await Promise.all([
      logActivity({
        user,
        action: "reject",
        entityType: "report",
        entityId: id,
        description: `${user.name} rejected report`,
      }),
      createNotification({
        userId: report.employee_id,
        type: "rejected",
        title: "Report Rejected",
        message: `Your weekly report has been rejected${req.body.comment ? `: "${req.body.comment}"` : ""}`,
        entityType: "report",
        entityId: id,
      }),
    ]);

    (async () => {
      const [emp] = await db
        .select({ email: employeesTable.email, name: employeesTable.name })
        .from(employeesTable)
        .where(eq(employeesTable.id, report.employee_id))
        .limit(1);
      if (emp) {
        queueEmail({
          recipientEmail: emp.email,
          recipientName: emp.name,
          triggerEvent: "report_rejected",
          templateData: {
            recipientName: emp.name,
            weekStart: report.week_start,
            reportId: id,
            reviewerName: user.name,
            comment: req.body.comment ?? undefined,
          },
        });
      }
    })().catch(err => console.error("Error queueing rejection email:", err));

    res.json(await enrichReport(updated));
  }
);

router.post(
  "/reports/:id/request-changes",
  requireAuth,
  requireRole("admin", "management", "department_head"),
  async (req, res): Promise<void> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = req.user!;

    const [report] = await db
      .select()
      .from(weeklyReportsTable)
      .where(and(eq(weeklyReportsTable.id, id), isNull(weeklyReportsTable.deleted_at)))
      .limit(1);

    if (!report) {
      res.status(404).json({ error: "Report not found" });
      return;
    }

    if (!["submitted", "under_review"].includes(report.status)) {
      res.status(400).json({ error: "Only submitted or under review reports can have changes requested" });
      return;
    }

    const [updated] = await db
      .update(weeklyReportsTable)
      .set({
        status: "needs_changes",
        reviewer_id: user.id,
        review_comment: req.body.comment ?? null,
        reviewed_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(weeklyReportsTable.id, id))
      .returning();

    await Promise.all([
      logActivity({
        user,
        action: "request_changes",
        entityType: "report",
        entityId: id,
        description: `${user.name} requested changes on report`,
      }),
      createNotification({
        userId: report.employee_id,
        type: "needs_changes",
        title: "Changes Requested",
        message: `Your weekly report needs changes${req.body.comment ? `: "${req.body.comment}"` : ""}`,
        entityType: "report",
        entityId: id,
      }),
    ]);

    (async () => {
      const [emp] = await db
        .select({ email: employeesTable.email, name: employeesTable.name })
        .from(employeesTable)
        .where(eq(employeesTable.id, report.employee_id))
        .limit(1);
      if (emp) {
        queueEmail({
          recipientEmail: emp.email,
          recipientName: emp.name,
          triggerEvent: "changes_requested",
          templateData: {
            recipientName: emp.name,
            weekStart: report.week_start,
            reportId: id,
            reviewerName: user.name,
            comment: req.body.comment ?? undefined,
          },
        });
      }
    })().catch(err => console.error("Error queueing changes requested email:", err));

    res.json(await enrichReport(updated));
  }
);

router.post(
  "/reports/:id/under-review",
  requireAuth,
  requireRole("admin", "management", "department_head"),
  async (req, res): Promise<void> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = req.user!;

    const [report] = await db
      .select()
      .from(weeklyReportsTable)
      .where(and(eq(weeklyReportsTable.id, id), isNull(weeklyReportsTable.deleted_at)))
      .limit(1);

    if (!report) {
      res.status(404).json({ error: "Report not found" });
      return;
    }

    if (report.status !== "submitted") {
      res.status(400).json({ error: "Only submitted reports can be put under review" });
      return;
    }

    const [updated] = await db
      .update(weeklyReportsTable)
      .set({
        status: "under_review",
        reviewer_id: user.id,
        reviewed_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(weeklyReportsTable.id, id))
      .returning();

    await logActivity({
      user,
      action: "under_review",
      entityType: "report",
      entityId: id,
      description: `${user.name} put report by employee ID ${report.employee_id} under review`,
    });

    res.json(await enrichReport(updated));
  }
);

export default router;
