import { Router, type IRouter } from "express";
import { eq, and, isNull, count, sql, desc, inArray } from "drizzle-orm";
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
  const deptIds = depts.map(d => d.id);
  
  let departments_on_track = 0;
  let departments_behind = 0;

  if (deptIds.length > 0) {
    const empCounts = await db
      .select({ department_id: employeesTable.department_id, empCount: count() })
      .from(employeesTable)
      .where(and(inArray(employeesTable.department_id, deptIds), isNull(employeesTable.deleted_at)))
      .groupBy(employeesTable.department_id);
    const empCountsMap = new Map(empCounts.filter(c => c.department_id !== null).map(c => [c.department_id as string, Number(c.empCount)]));

    const subCounts = await db
      .select({ department_id: weeklyReportsTable.department_id, submittedCount: count() })
      .from(weeklyReportsTable)
      .where(and(inArray(weeklyReportsTable.department_id, deptIds), eq(weeklyReportsTable.week_start, weekStart), isNull(weeklyReportsTable.deleted_at), sql`${weeklyReportsTable.status} != 'draft'`))
      .groupBy(weeklyReportsTable.department_id);
    const subCountsMap = new Map(subCounts.filter(c => c.department_id !== null).map(c => [c.department_id as string, Number(c.submittedCount)]));

    for (const dept of depts) {
      const empCount = empCountsMap.get(dept.id) ?? 0;
      const submittedCount = subCountsMap.get(dept.id) ?? 0;
      const pct = empCount > 0 ? (submittedCount / empCount) : 0;
      if (pct >= 0.8) departments_on_track++;
      else departments_behind++;
    }
  }

  // Recent approvals
  const recentLogs = await db
    .select()
    .from(activityLogsTable)
    .where(eq(activityLogsTable.action, "approve"))
    .orderBy(desc(activityLogsTable.created_at))
    .limit(5);

  const logUserIds = Array.from(new Set(recentLogs.map(log => log.user_id).filter((id): id is string => !!id)));
  const logUsers = logUserIds.length > 0
    ? await db.select({ id: employeesTable.id, name: employeesTable.name, photo_url: employeesTable.photo_url }).from(employeesTable).where(inArray(employeesTable.id, logUserIds))
    : [];
  const logUserMap = new Map(logUsers.map(u => [u.id, u]));

  const recent_approvals = recentLogs.map((log) => {
    const emp = log.user_id ? logUserMap.get(log.user_id) : null;
    return {
      id: log.id,
      user_name: emp?.name ?? "System",
      user_photo: emp?.photo_url ?? null,
      action: log.action,
      entity_type: log.entity_type ?? "",
      entity_id: log.entity_id ?? "",
      description: log.description,
      created_at: log.created_at.toISOString(),
    };
  });

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
  const deptIds = depts.map(d => d.id);
  const headIds = depts.map(d => d.head_id).filter((id): id is string => !!id);

  const headUsers = headIds.length > 0
    ? await db.select({ id: employeesTable.id, name: employeesTable.name }).from(employeesTable).where(inArray(employeesTable.id, headIds))
    : [];
  const headMap = new Map(headUsers.map(h => [h.id, h.name]));

  // Bulk queries for counts grouped by department_id
  const empCountsMap = new Map<string, number>();
  const submittedMap = new Map<string, number>();
  const approvedMap = new Map<string, number>();
  const pendingMap = new Map<string, number>();
  const lateMap = new Map<string, number>();

  if (deptIds.length > 0) {
    const empCounts = await db.select({ department_id: employeesTable.department_id, c: count() }).from(employeesTable).where(and(inArray(employeesTable.department_id, deptIds), isNull(employeesTable.deleted_at))).groupBy(employeesTable.department_id);
    empCounts.forEach(x => x.department_id && empCountsMap.set(x.department_id, Number(x.c)));

    const submittedList = await db.select({ department_id: weeklyReportsTable.department_id, c: count() }).from(weeklyReportsTable).where(and(inArray(weeklyReportsTable.department_id, deptIds), eq(weeklyReportsTable.week_start, weekStart), isNull(weeklyReportsTable.deleted_at), sql`${weeklyReportsTable.status} != 'draft'`)).groupBy(weeklyReportsTable.department_id);
    submittedList.forEach(x => x.department_id && submittedMap.set(x.department_id, Number(x.c)));

    const approvedList = await db.select({ department_id: weeklyReportsTable.department_id, c: count() }).from(weeklyReportsTable).where(and(inArray(weeklyReportsTable.department_id, deptIds), eq(weeklyReportsTable.week_start, weekStart), eq(weeklyReportsTable.status, "approved"), isNull(weeklyReportsTable.deleted_at))).groupBy(weeklyReportsTable.department_id);
    approvedList.forEach(x => x.department_id && approvedMap.set(x.department_id, Number(x.c)));

    const pendingList = await db.select({ department_id: weeklyReportsTable.department_id, c: count() }).from(weeklyReportsTable).where(and(inArray(weeklyReportsTable.department_id, deptIds), eq(weeklyReportsTable.week_start, weekStart), eq(weeklyReportsTable.status, "submitted"), isNull(weeklyReportsTable.deleted_at))).groupBy(weeklyReportsTable.department_id);
    pendingList.forEach(x => x.department_id && pendingMap.set(x.department_id, Number(x.c)));

    const lateList = await db.select({ department_id: weeklyReportsTable.department_id, c: count() }).from(weeklyReportsTable).where(and(inArray(weeklyReportsTable.department_id, deptIds), isNull(weeklyReportsTable.deleted_at), sql`${weeklyReportsTable.submitted_at} > (${weeklyReportsTable.week_start}::date + INTERVAL '4 days' + INTERVAL '17 hours')`)).groupBy(weeklyReportsTable.department_id);
    lateList.forEach(x => x.department_id && lateMap.set(x.department_id, Number(x.c)));
  }

  const result = depts.map((dept) => {
    const empTotal = empCountsMap.get(dept.id) ?? 0;
    const submitted = submittedMap.get(dept.id) ?? 0;
    return {
      department_id: dept.id,
      department_name: dept.name,
      head_name: dept.head_id ? (headMap.get(dept.head_id) ?? null) : null,
      total_employees: empTotal,
      submitted,
      approved: approvedMap.get(dept.id) ?? 0,
      pending: pendingMap.get(dept.id) ?? 0,
      late: lateMap.get(dept.id) ?? 0,
      completion_pct: empTotal > 0 ? Math.round((submitted / empTotal) * 100) : 0,
    };
  });

  res.json(result);
});

router.get("/management/top-contributors", requireAuth, MANAGEMENT_AND_ADMIN, async (req, res): Promise<void> => {
  const limit = Math.min(50, parseInt((req.query.limit as string) || "10"));

  const employees = await db
    .select()
    .from(employeesTable)
    .where(and(isNull(employeesTable.deleted_at), eq(employeesTable.status, "active")))
    .limit(50);

  const empIds = employees.map(e => e.id);
  const deptIds = Array.from(new Set(employees.map(e => e.department_id).filter((id): id is string => !!id)));

  // Bulk fetch total reports counts
  const totalReportsMap = new Map<string, number>();
  const approvedReportsMap = new Map<string, number>();
  const deptNamesMap = new Map<string, string>();

  if (empIds.length > 0) {
    const totalReports = await db.select({ employee_id: weeklyReportsTable.employee_id, c: count() }).from(weeklyReportsTable).where(and(inArray(weeklyReportsTable.employee_id, empIds), isNull(weeklyReportsTable.deleted_at))).groupBy(weeklyReportsTable.employee_id);
    totalReports.forEach(x => totalReportsMap.set(x.employee_id, Number(x.c)));

    const approvedReports = await db.select({ employee_id: weeklyReportsTable.employee_id, c: count() }).from(weeklyReportsTable).where(and(inArray(weeklyReportsTable.employee_id, empIds), eq(weeklyReportsTable.status, "approved"), isNull(weeklyReportsTable.deleted_at))).groupBy(weeklyReportsTable.employee_id);
    approvedReports.forEach(x => approvedReportsMap.set(x.employee_id, Number(x.c)));
  }

  if (deptIds.length > 0) {
    const depts = await db.select({ id: departmentsTable.id, name: departmentsTable.name }).from(departmentsTable).where(inArray(departmentsTable.id, deptIds));
    depts.forEach(d => deptNamesMap.set(d.id, d.name));
  }

  const withStats = employees.map((emp) => {
    const total = totalReportsMap.get(emp.id) ?? 0;
    const approved = approvedReportsMap.get(emp.id) ?? 0;
    return {
      employee_id: emp.id,
      employee_name: emp.name,
      employee_photo: emp.photo_url,
      department_name: emp.department_id ? (deptNamesMap.get(emp.department_id) ?? null) : null,
      total_reports: total,
      streak_weeks: Math.min(total, 8),
      on_time_pct: total > 0 ? Math.round((approved / total) * 100) : 0,
    };
  });

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

  const empIds = Array.from(new Set(reports.map(r => r.employee_id)));
  const deptIds = Array.from(new Set(reports.map(r => r.department_id).filter((id): id is string => !!id)));

  const empMap = new Map<string, typeof employeesTable.$inferSelect>();
  const deptMap = new Map<string, string>();

  if (empIds.length > 0) {
    const emps = await db.select().from(employeesTable).where(inArray(employeesTable.id, empIds));
    emps.forEach(e => empMap.set(e.id, e));
  }

  if (deptIds.length > 0) {
    const depts = await db.select({ id: departmentsTable.id, name: departmentsTable.name }).from(departmentsTable).where(inArray(departmentsTable.id, deptIds));
    depts.forEach(d => deptMap.set(d.id, d.name));
  }

  const enriched = reports.map((r) => {
    const emp = empMap.get(r.employee_id);
    return {
      id: r.id,
      employee_id: r.employee_id,
      employee_name: emp?.name ?? "Unknown",
      employee_photo: emp?.photo_url ?? null,
      department_id: r.department_id,
      department_name: r.department_id ? (deptMap.get(r.department_id) ?? null) : null,
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
  });

  res.json({
    data: enriched,
    total: Number(total),
    page: pageNum,
    limit: limitNum,
    total_pages: Math.ceil(Number(total) / limitNum),
  });
});

export default router;
