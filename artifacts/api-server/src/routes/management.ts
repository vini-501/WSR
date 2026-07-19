import { Router, type IRouter } from "express";
import { eq, and, isNull, count, sql, desc } from "drizzle-orm";
import { db, employeesTable, departmentsTable, weeklyReportsTable, activityLogsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { MANAGEMENT_AND_ADMIN } from "../middlewares/rbac";

const router: IRouter = Router();

router.get("/management/summary", requireAuth, MANAGEMENT_AND_ADMIN, async (req, res): Promise<void> => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  const weekStart = monday.toISOString().split("T")[0];

  const [total_this_week, pending, late, approved_this_week] = await Promise.all([
    db.select({ c: count() }).from(weeklyReportsTable).where(and(eq(weeklyReportsTable.week_start, weekStart), isNull(weeklyReportsTable.deleted_at), sql`${weeklyReportsTable.status} != 'draft'`)),
    db.select({ c: count() }).from(weeklyReportsTable).where(and(eq(weeklyReportsTable.status, "submitted"), isNull(weeklyReportsTable.deleted_at))),
    db.select({ c: count() }).from(weeklyReportsTable).where(and(isNull(weeklyReportsTable.deleted_at), sql`${weeklyReportsTable.submitted_at} > (${weeklyReportsTable.week_start}::date + INTERVAL '4 days' + INTERVAL '17 hours')`)),
    db.select({ c: count() }).from(weeklyReportsTable).where(and(eq(weeklyReportsTable.status, "approved"), eq(weeklyReportsTable.week_start, weekStart), isNull(weeklyReportsTable.deleted_at))),
  ]);

  const [total_employees] = await db.select({ c: count() }).from(employeesTable).where(and(isNull(employeesTable.deleted_at), eq(employeesTable.status, "active")));

  const totalEmp = Number(total_employees.c);
  const thisWeek = Number(total_this_week[0].c);
  const completion_rate_pct = totalEmp > 0 ? Math.round((thisWeek / totalEmp) * 100) : 0;

  // Department on track / behind
  const depts = await db.select().from(departmentsTable).where(and(isNull(departmentsTable.deleted_at), eq(departmentsTable.status, "active")));
  let departments_on_track = 0;
  let departments_behind = 0;

  for (const dept of depts) {
    const [{ empCount }] = await db.select({ empCount: count() }).from(employeesTable).where(and(eq(employeesTable.department_id, dept.id), isNull(employeesTable.deleted_at)));
    const [{ submittedCount }] = await db.select({ submittedCount: count() }).from(weeklyReportsTable).where(and(eq(weeklyReportsTable.department_id, dept.id), eq(weeklyReportsTable.week_start, weekStart), isNull(weeklyReportsTable.deleted_at), sql`${weeklyReportsTable.status} != 'draft'`));
    const pct = Number(empCount) > 0 ? (Number(submittedCount) / Number(empCount)) : 0;
    if (pct >= 0.8) departments_on_track++;
    else departments_behind++;
  }

  // Recent approvals
  const recentLogs = await db
    .select()
    .from(activityLogsTable)
    .where(eq(activityLogsTable.action, "approve"))
    .orderBy(desc(activityLogsTable.created_at))
    .limit(5);

  const recent_approvals = await Promise.all(
    recentLogs.map(async (log) => {
      let user_name = "System";
      let user_photo: string | null = null;
      if (log.user_id) {
        const [emp] = await db.select({ name: employeesTable.name, photo_url: employeesTable.photo_url }).from(employeesTable).where(eq(employeesTable.id, log.user_id)).limit(1);
        user_name = emp?.name ?? "Unknown";
        user_photo = emp?.photo_url ?? null;
      }
      return { id: log.id, user_name, user_photo, action: log.action, entity_type: log.entity_type ?? "", entity_id: log.entity_id ?? "", description: log.description, created_at: log.created_at.toISOString() };
    })
  );

  res.json({
    total_reports_this_week: thisWeek,
    pending_reviews: Number(pending[0].c),
    late_reports: Number(late[0].c),
    approved_this_week: Number(approved_this_week[0].c),
    completion_rate_pct,
    departments_on_track,
    departments_behind,
    recent_approvals,
  });
});

router.get("/management/department-completion", requireAuth, MANAGEMENT_AND_ADMIN, async (req, res): Promise<void> => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  const weekStart = monday.toISOString().split("T")[0];

  const depts = await db.select().from(departmentsTable).where(and(isNull(departmentsTable.deleted_at), eq(departmentsTable.status, "active")));

  const result = await Promise.all(
    depts.map(async (dept) => {
      let head_name: string | null = null;
      if (dept.head_id) {
        const [head] = await db.select({ name: employeesTable.name }).from(employeesTable).where(eq(employeesTable.id, dept.head_id)).limit(1);
        head_name = head?.name ?? null;
      }

      const [{ empCount }] = await db.select({ empCount: count() }).from(employeesTable).where(and(eq(employeesTable.department_id, dept.id), isNull(employeesTable.deleted_at)));
      const [{ submitted }] = await db.select({ submitted: count() }).from(weeklyReportsTable).where(and(eq(weeklyReportsTable.department_id, dept.id), eq(weeklyReportsTable.week_start, weekStart), isNull(weeklyReportsTable.deleted_at), sql`${weeklyReportsTable.status} != 'draft'`));
      const [{ approved }] = await db.select({ approved: count() }).from(weeklyReportsTable).where(and(eq(weeklyReportsTable.department_id, dept.id), eq(weeklyReportsTable.week_start, weekStart), eq(weeklyReportsTable.status, "approved"), isNull(weeklyReportsTable.deleted_at)));
      const [{ pending }] = await db.select({ pending: count() }).from(weeklyReportsTable).where(and(eq(weeklyReportsTable.department_id, dept.id), eq(weeklyReportsTable.week_start, weekStart), eq(weeklyReportsTable.status, "submitted"), isNull(weeklyReportsTable.deleted_at)));
      const [{ late }] = await db.select({ late: count() }).from(weeklyReportsTable).where(and(eq(weeklyReportsTable.department_id, dept.id), isNull(weeklyReportsTable.deleted_at), sql`${weeklyReportsTable.submitted_at} > (${weeklyReportsTable.week_start}::date + INTERVAL '4 days' + INTERVAL '17 hours')`));

      const empTotal = Number(empCount);
      return {
        department_id: dept.id,
        department_name: dept.name,
        head_name,
        total_employees: empTotal,
        submitted: Number(submitted),
        approved: Number(approved),
        pending: Number(pending),
        late: Number(late),
        completion_pct: empTotal > 0 ? Math.round((Number(submitted) / empTotal) * 100) : 0,
      };
    })
  );

  res.json(result);
});

router.get("/management/top-contributors", requireAuth, MANAGEMENT_AND_ADMIN, async (req, res): Promise<void> => {
  const limit = Math.min(50, parseInt((req.query.limit as string) || "10"));

  const employees = await db
    .select()
    .from(employeesTable)
    .where(and(isNull(employeesTable.deleted_at), eq(employeesTable.status, "active")))
    .limit(50);

  const withStats = await Promise.all(
    employees.map(async (emp) => {
      const [{ total }] = await db.select({ total: count() }).from(weeklyReportsTable).where(and(eq(weeklyReportsTable.employee_id, emp.id), isNull(weeklyReportsTable.deleted_at)));
      const [{ approved }] = await db.select({ approved: count() }).from(weeklyReportsTable).where(and(eq(weeklyReportsTable.employee_id, emp.id), eq(weeklyReportsTable.status, "approved"), isNull(weeklyReportsTable.deleted_at)));

      let department_name: string | null = null;
      if (emp.department_id) {
        const [dept] = await db.select({ name: departmentsTable.name }).from(departmentsTable).where(eq(departmentsTable.id, emp.department_id)).limit(1);
        department_name = dept?.name ?? null;
      }

      return {
        employee_id: emp.id,
        employee_name: emp.name,
        employee_photo: emp.photo_url,
        department_name,
        total_reports: Number(total),
        streak_weeks: Math.min(Number(total), 8), // Simplified streak
        on_time_pct: Number(total) > 0 ? Math.round((Number(approved) / Number(total)) * 100) : 0,
      };
    })
  );

  const sorted = withStats.sort((a, b) => b.total_reports - a.total_reports).slice(0, limit);
  res.json(sorted);
});

router.get("/management/pending-reviews", requireAuth, MANAGEMENT_AND_ADMIN, async (req, res): Promise<void> => {
  const { page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const where = and(eq(weeklyReportsTable.status, "submitted"), isNull(weeklyReportsTable.deleted_at));
  const [{ total }] = await db.select({ total: count() }).from(weeklyReportsTable).where(where);

  const reports = await db
    .select()
    .from(weeklyReportsTable)
    .where(where)
    .orderBy(desc(weeklyReportsTable.submitted_at))
    .limit(limitNum)
    .offset(offset);

  const enriched = await Promise.all(reports.map(async (r) => {
    const [emp] = await db.select({ name: employeesTable.name, photo_url: employeesTable.photo_url }).from(employeesTable).where(eq(employeesTable.id, r.employee_id)).limit(1);
    let department_name: string | null = null;
    if (r.department_id) {
      const [dept] = await db.select({ name: departmentsTable.name }).from(departmentsTable).where(eq(departmentsTable.id, r.department_id)).limit(1);
      department_name = dept?.name ?? null;
    }
    return {
      id: r.id,
      employee_id: r.employee_id,
      employee_name: emp?.name ?? "Unknown",
      employee_photo: emp?.photo_url ?? null,
      department_id: r.department_id,
      department_name,
      week_start: r.week_start,
      achievements: r.achievements,
      completed_tasks: r.completed_tasks,
      blockers: r.blockers,
      next_week_plans: r.next_week_plans,
      additional_notes: r.additional_notes,
      status: r.status,
      reviewer_id: r.reviewer_id,
      reviewer_name: null,
      review_comment: r.review_comment,
      reviewed_at: r.reviewed_at?.toISOString() ?? null,
      submitted_at: r.submitted_at?.toISOString() ?? null,
      created_at: r.created_at.toISOString(),
      updated_at: r.updated_at.toISOString(),
    };
  }));

  res.json({
    data: enriched,
    total: Number(total),
    page: pageNum,
    limit: limitNum,
    total_pages: Math.ceil(Number(total) / limitNum),
  });
});

export default router;
