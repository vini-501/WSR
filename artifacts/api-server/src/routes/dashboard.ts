import { Router, type IRouter } from "express";
import { eq, and, isNull, count, sql, desc } from "drizzle-orm";
import {
  db, employeesTable, departmentsTable, weeklyReportsTable, activityLogsTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/dashboard/stats", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;

  // Scope by department for dept heads
  const reportConditions = [isNull(weeklyReportsTable.deleted_at)];
  if (user.role === "department_head" && user.department_id) {
    reportConditions.push(eq(weeklyReportsTable.department_id, user.department_id));
  } else if (user.role === "employee") {
    reportConditions.push(eq(weeklyReportsTable.employee_id, user.id));
  }

  // Current week start (Monday)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  const weekStart = monday.toISOString().split("T")[0];

  const [total_employees, total_departments] = await Promise.all([
    db.select({ c: count() }).from(employeesTable).where(and(isNull(employeesTable.deleted_at), eq(employeesTable.status, "active"))),
    db.select({ c: count() }).from(departmentsTable).where(and(isNull(departmentsTable.deleted_at), eq(departmentsTable.status, "active"))),
  ]);

  const [pending, approved, total_this_week, submitted_today] = await Promise.all([
    db.select({ c: count() }).from(weeklyReportsTable).where(and(...reportConditions, eq(weeklyReportsTable.status, "submitted"))),
    db.select({ c: count() }).from(weeklyReportsTable).where(and(...reportConditions, eq(weeklyReportsTable.status, "approved"))),
    db.select({ c: count() }).from(weeklyReportsTable).where(and(...reportConditions, eq(weeklyReportsTable.week_start, weekStart))),
    db.select({ c: count() }).from(weeklyReportsTable).where(
      and(...reportConditions, sql`DATE(${weeklyReportsTable.submitted_at}) = CURRENT_DATE`)
    ),
  ]);

  // Late reports: submitted after their deadline (simplified: submitted on non-Friday or missing for current week)
  const [late_reports] = await db.select({ c: count() }).from(weeklyReportsTable).where(
    and(...reportConditions, eq(weeklyReportsTable.status, "submitted"),
      sql`${weeklyReportsTable.submitted_at} > (${weeklyReportsTable.week_start}::date + INTERVAL '4 days' + INTERVAL '17 hours')`
    )
  );

  // Weekly completion %: submitted+approved / total employees
  const activeEmpCount = Number(total_employees[0].c);
  const submittedThisWeek = Number(total_this_week[0].c);
  const weekly_completion_pct = activeEmpCount > 0
    ? Math.round((submittedThisWeek / activeEmpCount) * 100)
    : 0;

  res.json({
    total_employees: Number(total_employees[0].c),
    total_departments: Number(total_departments[0].c),
    pending_reports: Number(pending[0].c),
    approved_reports: Number(approved[0].c),
    late_reports: Number(late_reports.c),
    weekly_completion_pct,
    reports_this_week: submittedThisWeek,
    reports_submitted_today: Number(submitted_today[0].c),
  });
});

router.get("/dashboard/recent-activity", requireAuth, async (req, res): Promise<void> => {
  const limit = Math.min(50, parseInt((req.query.limit as string) || "10"));

  const logs = await db
    .select()
    .from(activityLogsTable)
    .orderBy(desc(activityLogsTable.created_at))
    .limit(limit);

  const enriched = await Promise.all(
    logs.map(async (log) => {
      let user_name = "System";
      let user_photo: string | null = null;
      if (log.user_id) {
        const [emp] = await db
          .select({ name: employeesTable.name, photo_url: employeesTable.photo_url })
          .from(employeesTable)
          .where(eq(employeesTable.id, log.user_id))
          .limit(1);
        user_name = emp?.name ?? "Unknown";
        user_photo = emp?.photo_url ?? null;
      }
      return {
        id: log.id,
        user_name,
        user_photo,
        action: log.action,
        entity_type: log.entity_type ?? "",
        entity_id: log.entity_id ?? "",
        description: log.description,
        created_at: log.created_at.toISOString(),
      };
    })
  );

  res.json(enriched);
});

router.get("/dashboard/upcoming-deadlines", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;

  const deptConditions = [isNull(departmentsTable.deleted_at), eq(departmentsTable.status, "active")];
  if (user.role === "department_head" && user.department_id) {
    deptConditions.push(eq(departmentsTable.id, user.department_id));
  }

  const depts = await db.select().from(departmentsTable).where(and(...deptConditions));

  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  const weekStart = monday.toISOString().split("T")[0];

  const deadlines = await Promise.all(
    depts.map(async (dept) => {
      const [{ empCount }] = await db
        .select({ empCount: count() })
        .from(employeesTable)
        .where(and(eq(employeesTable.department_id, dept.id), isNull(employeesTable.deleted_at)));

      const [{ submittedCount }] = await db
        .select({ submittedCount: count() })
        .from(weeklyReportsTable)
        .where(
          and(
            eq(weeklyReportsTable.department_id, dept.id),
            eq(weeklyReportsTable.week_start, weekStart),
            isNull(weeklyReportsTable.deleted_at)
          )
        );

      // Calculate next deadline (Friday of this week)
      const friday = new Date(monday);
      friday.setDate(monday.getDate() + 4);
      if (dept.submission_deadline) {
        const [h, m] = dept.submission_deadline.split(":").map(Number);
        friday.setHours(h || 17, m || 0, 0, 0);
      } else {
        friday.setHours(17, 0, 0, 0);
      }

      const daysRemaining = Math.max(0, Math.ceil((friday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

      return {
        department_id: dept.id,
        department_name: dept.name,
        deadline: friday.toISOString(),
        days_remaining: daysRemaining,
        submitted_count: Number(submittedCount),
        total_count: Number(empCount),
      };
    })
  );

  res.json(deadlines);
});

router.get("/dashboard/chart-data", requireAuth, async (req, res): Promise<void> => {
  const weeks = Math.min(52, parseInt((req.query.weeks as string) || "8"));
  const user = req.user!;

  const weeklyTrends = [];
  const now = new Date();

  for (let i = weeks - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(now.getDate() - i * 7);
    const dayOfWeek = date.getDay();
    const monday = new Date(date);
    monday.setDate(date.getDate() - ((dayOfWeek + 6) % 7));
    const weekStr = monday.toISOString().split("T")[0];

    const conditions = [eq(weeklyReportsTable.week_start, weekStr), isNull(weeklyReportsTable.deleted_at)];
    if (user.role === "department_head" && user.department_id) {
      conditions.push(eq(weeklyReportsTable.department_id, user.department_id));
    } else if (user.role === "employee") {
      conditions.push(eq(weeklyReportsTable.employee_id, user.id));
    }

    const [submitted] = await db.select({ c: count() }).from(weeklyReportsTable).where(and(...conditions, sql`${weeklyReportsTable.status} IN ('submitted', 'approved', 'rejected', 'needs_changes')`));
    const [approved] = await db.select({ c: count() }).from(weeklyReportsTable).where(and(...conditions, eq(weeklyReportsTable.status, "approved")));
    const [rejected] = await db.select({ c: count() }).from(weeklyReportsTable).where(and(...conditions, eq(weeklyReportsTable.status, "rejected")));
    const [late] = await db.select({ c: count() }).from(weeklyReportsTable).where(
      and(...conditions, sql`${weeklyReportsTable.submitted_at} > (${weeklyReportsTable.week_start}::date + INTERVAL '4 days' + INTERVAL '17 hours')`)
    );

    weeklyTrends.push({
      label: weekStr,
      submitted: Number(submitted.c),
      approved: Number(approved.c),
      rejected: Number(rejected.c),
      late: Number(late.c),
    });
  }

  // Department comparison
  const depts = await db.select().from(departmentsTable).where(and(isNull(departmentsTable.deleted_at), eq(departmentsTable.status, "active"))).limit(10);
  const deptComparison = await Promise.all(
    depts.map(async (dept) => {
      const [{ empCount }] = await db.select({ empCount: count() }).from(employeesTable).where(and(eq(employeesTable.department_id, dept.id), isNull(employeesTable.deleted_at)));
      const [{ submitted }] = await db.select({ submitted: count() }).from(weeklyReportsTable).where(and(eq(weeklyReportsTable.department_id, dept.id), sql`${weeklyReportsTable.status} != 'draft'`, isNull(weeklyReportsTable.deleted_at)));
      const [{ approved }] = await db.select({ approved: count() }).from(weeklyReportsTable).where(and(eq(weeklyReportsTable.department_id, dept.id), eq(weeklyReportsTable.status, "approved"), isNull(weeklyReportsTable.deleted_at)));
      const empTotal = Number(empCount);

      return {
        department_id: dept.id,
        department_name: dept.name,
        submitted: Number(submitted),
        approved: Number(approved),
        completion_pct: empTotal > 0 ? Math.round((Number(submitted) / empTotal) * 100) : 0,
        total_employees: empTotal,
      };
    })
  );

  res.json({ weekly_reports: weeklyTrends, department_comparison: deptComparison });
});

export default router;
