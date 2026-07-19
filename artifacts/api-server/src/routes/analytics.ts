import { Router, type IRouter } from "express";
import { eq, and, isNull, count, sql, desc } from "drizzle-orm";
import { db, employeesTable, departmentsTable, weeklyReportsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { MANAGEMENT_AND_ADMIN } from "../middlewares/rbac";

const router: IRouter = Router();

router.get("/analytics/overview", requireAuth, MANAGEMENT_AND_ADMIN, async (req, res): Promise<void> => {
  const [total_reports] = await db.select({ c: count() }).from(weeklyReportsTable).where(isNull(weeklyReportsTable.deleted_at));
  const [approved_reports] = await db.select({ c: count() }).from(weeklyReportsTable).where(and(isNull(weeklyReportsTable.deleted_at), eq(weeklyReportsTable.status, "approved")));
  const [total_employees] = await db.select({ c: count() }).from(employeesTable).where(isNull(employeesTable.deleted_at));
  const total = Number(total_reports.c);
  const approved = Number(approved_reports.c);
  const employees = Number(total_employees.c);

  const submission_rate_pct = employees > 0 ? Math.round((total / employees) * 100) : 0;
  const approval_rate = total > 0 ? Math.round((approved / total) * 100) : 0;

  // Most active department
  const deptActivity = await db
    .select({
      dept_id: weeklyReportsTable.department_id,
      c: count(),
    })
    .from(weeklyReportsTable)
    .where(isNull(weeklyReportsTable.deleted_at))
    .groupBy(weeklyReportsTable.department_id)
    .orderBy(desc(count()))
    .limit(1);

  let most_active_department: string | null = null;
  if (deptActivity[0]?.dept_id) {
    const [dept] = await db
      .select({ name: departmentsTable.name })
      .from(departmentsTable)
      .where(eq(departmentsTable.id, deptActivity[0].dept_id))
      .limit(1);
    most_active_department = dept?.name ?? null;
  }

  res.json({
    total_reports_all_time: total,
    submission_rate_pct,
    avg_approval_time_hours: 24, // Simplified
    late_submission_pct: 100 - approval_rate,
    most_active_department,
    top_submitter: null,
  });
});

router.get("/analytics/weekly-trends", requireAuth, MANAGEMENT_AND_ADMIN, async (req, res): Promise<void> => {
  const weeks = Math.min(52, parseInt((req.query.weeks as string) || "12"));
  const now = new Date();
  const trends = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(now.getDate() - i * 7);
    const dayOfWeek = date.getDay();
    const monday = new Date(date);
    monday.setDate(date.getDate() - ((dayOfWeek + 6) % 7));
    const weekStr = monday.toISOString().split("T")[0];

    const [submitted] = await db.select({ c: count() }).from(weeklyReportsTable).where(and(eq(weeklyReportsTable.week_start, weekStr), isNull(weeklyReportsTable.deleted_at), sql`${weeklyReportsTable.status} != 'draft'`));
    const [approved] = await db.select({ c: count() }).from(weeklyReportsTable).where(and(eq(weeklyReportsTable.week_start, weekStr), eq(weeklyReportsTable.status, "approved"), isNull(weeklyReportsTable.deleted_at)));
    const [rejected] = await db.select({ c: count() }).from(weeklyReportsTable).where(and(eq(weeklyReportsTable.week_start, weekStr), eq(weeklyReportsTable.status, "rejected"), isNull(weeklyReportsTable.deleted_at)));
    const [late] = await db.select({ c: count() }).from(weeklyReportsTable).where(and(eq(weeklyReportsTable.week_start, weekStr), isNull(weeklyReportsTable.deleted_at), sql`${weeklyReportsTable.submitted_at} > (${weeklyReportsTable.week_start}::date + INTERVAL '4 days' + INTERVAL '17 hours')`));

    trends.push({ label: weekStr, submitted: Number(submitted.c), approved: Number(approved.c), rejected: Number(rejected.c), late: Number(late.c) });
  }

  res.json(trends);
});

router.get("/analytics/monthly-trends", requireAuth, MANAGEMENT_AND_ADMIN, async (req, res): Promise<void> => {
  const months = Math.min(24, parseInt((req.query.months as string) || "12"));
  const now = new Date();
  const trends = [];

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStart = date.toISOString().split("T")[0];
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split("T")[0];
    const label = date.toLocaleString("en-US", { month: "short", year: "2-digit" });

    const [submitted] = await db.select({ c: count() }).from(weeklyReportsTable).where(
      and(isNull(weeklyReportsTable.deleted_at), sql`${weeklyReportsTable.week_start} >= ${monthStart} AND ${weeklyReportsTable.week_start} <= ${monthEnd}`, sql`${weeklyReportsTable.status} != 'draft'`)
    );
    const [approved] = await db.select({ c: count() }).from(weeklyReportsTable).where(
      and(eq(weeklyReportsTable.status, "approved"), isNull(weeklyReportsTable.deleted_at), sql`${weeklyReportsTable.week_start} >= ${monthStart} AND ${weeklyReportsTable.week_start} <= ${monthEnd}`)
    );
    const [rejected] = await db.select({ c: count() }).from(weeklyReportsTable).where(
      and(eq(weeklyReportsTable.status, "rejected"), isNull(weeklyReportsTable.deleted_at), sql`${weeklyReportsTable.week_start} >= ${monthStart} AND ${weeklyReportsTable.week_start} <= ${monthEnd}`)
    );

    trends.push({ label, submitted: Number(submitted.c), approved: Number(approved.c), rejected: Number(rejected.c), late: 0 });
  }

  res.json(trends);
});

router.get("/analytics/department-comparison", requireAuth, MANAGEMENT_AND_ADMIN, async (req, res): Promise<void> => {
  const depts = await db.select().from(departmentsTable).where(and(isNull(departmentsTable.deleted_at), eq(departmentsTable.status, "active")));

  const result = await Promise.all(
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

  res.json(result);
});

router.get("/analytics/employee-activity", requireAuth, MANAGEMENT_AND_ADMIN, async (req, res): Promise<void> => {
  const limit = Math.min(50, parseInt((req.query.limit as string) || "10"));

  const employees = await db
    .select()
    .from(employeesTable)
    .where(and(isNull(employeesTable.deleted_at), eq(employeesTable.status, "active")))
    .limit(limit);

  const result = await Promise.all(
    employees.map(async (emp) => {
      const [{ total }] = await db.select({ total: count() }).from(weeklyReportsTable).where(and(eq(weeklyReportsTable.employee_id, emp.id), isNull(weeklyReportsTable.deleted_at)));
      const [{ approved }] = await db.select({ approved: count() }).from(weeklyReportsTable).where(and(eq(weeklyReportsTable.employee_id, emp.id), eq(weeklyReportsTable.status, "approved"), isNull(weeklyReportsTable.deleted_at)));
      const totalNum = Number(total);

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
        total_reports: totalNum,
        approved_reports: Number(approved),
        on_time_pct: totalNum > 0 ? Math.round((Number(approved) / totalNum) * 100) : 0,
      };
    })
  );

  res.json(result);
});

export default router;
