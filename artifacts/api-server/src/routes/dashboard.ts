import { Router, type IRouter } from "express";
import { eq, and, isNull, count, sql, desc, inArray } from "drizzle-orm";
import {
  db, employeesTable, departmentsTable, weeklyReportsTable, activityLogsTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// Health check
router.get("/health", (_req, res) => { res.json({ status: "ok" }); });

router.get("/dashboard/stats", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const reportConditions = [isNull(weeklyReportsTable.deleted_at)];
  if (user.role === "department_head" && user.department_id) {
    reportConditions.push(eq(weeklyReportsTable.department_id, user.department_id));
  } else if (user.role === "employee") {
    reportConditions.push(eq(weeklyReportsTable.employee_id, user.id));
  }
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
    db.select({ c: count() }).from(weeklyReportsTable).where(and(...reportConditions, inArray(weeklyReportsTable.status, ["submitted", "under_review"]))),
    db.select({ c: count() }).from(weeklyReportsTable).where(and(...reportConditions, eq(weeklyReportsTable.status, "approved"))),
    db.select({ c: count() }).from(weeklyReportsTable).where(and(...reportConditions, eq(weeklyReportsTable.week_start, weekStart))),
    db.select({ c: count() }).from(weeklyReportsTable).where(and(...reportConditions, sql`DATE(${weeklyReportsTable.submitted_at}) = CURRENT_DATE`)),
  ]);
  const [late_reports] = await db.select({ c: count() }).from(weeklyReportsTable).where(
    and(...reportConditions, inArray(weeklyReportsTable.status, ["submitted", "under_review"]),
      sql`${weeklyReportsTable.submitted_at} > (${weeklyReportsTable.week_start}::date + INTERVAL '4 days' + INTERVAL '17 hours')`
    )
  );
  const activeEmpCount = Number(total_employees[0].c);
  const submittedThisWeek = Number(total_this_week[0].c);
  const weekly_completion_pct = activeEmpCount > 0 ? Math.round((submittedThisWeek / activeEmpCount) * 100) : 0;
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
  const logs = await db.select().from(activityLogsTable).orderBy(desc(activityLogsTable.created_at)).limit(limit);
  const userIds = Array.from(new Set(logs.map(log => log.user_id).filter((id): id is string => !!id)));
  const users = userIds.length > 0
    ? await db.select({ id: employeesTable.id, name: employeesTable.name, photo_url: employeesTable.photo_url }).from(employeesTable).where(inArray(employeesTable.id, userIds))
    : [];
  const userMap = new Map(users.map(u => [u.id, u]));
  const enriched = logs.map((log) => {
    const emp = log.user_id ? userMap.get(log.user_id) : null;
    return { id: log.id, user_name: emp?.name ?? "System", user_photo: emp?.photo_url ?? null, action: log.action, entity_type: log.entity_type ?? "", entity_id: log.entity_id ?? "", description: log.description, created_at: log.created_at.toISOString() };
  });
  res.json(enriched);
});

router.get("/dashboard/upcoming-deadlines", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const deptConditions = [isNull(departmentsTable.deleted_at), eq(departmentsTable.status, "active")];
  if (user.role === "department_head" && user.department_id) deptConditions.push(eq(departmentsTable.id, user.department_id));
  const depts = await db.select().from(departmentsTable).where(and(...deptConditions));
  const deptIds = depts.map(d => d.id);
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  const weekStart = monday.toISOString().split("T")[0];
  const empCountsMap = new Map<string, number>();
  const submittedCountsMap = new Map<string, number>();
  if (deptIds.length > 0) {
    const empCounts = await db.select({ department_id: employeesTable.department_id, empCount: count() }).from(employeesTable).where(and(inArray(employeesTable.department_id, deptIds), isNull(employeesTable.deleted_at))).groupBy(employeesTable.department_id);
    empCounts.forEach(c => c.department_id && empCountsMap.set(c.department_id, Number(c.empCount)));
    const submittedCounts = await db.select({ department_id: weeklyReportsTable.department_id, submittedCount: count() }).from(weeklyReportsTable).where(and(inArray(weeklyReportsTable.department_id, deptIds), eq(weeklyReportsTable.week_start, weekStart), isNull(weeklyReportsTable.deleted_at))).groupBy(weeklyReportsTable.department_id);
    submittedCounts.forEach(c => c.department_id && submittedCountsMap.set(c.department_id, Number(c.submittedCount)));
  }
  const deadlines = depts.map((dept) => {
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    if (dept.submission_deadline) {
      const [h, m] = dept.submission_deadline.split(":").map(Number);
      friday.setHours(h || 17, m || 0, 0, 0);
    } else { friday.setHours(17, 0, 0, 0); }
    const daysRemaining = Math.max(0, Math.ceil((friday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    return { department_id: dept.id, department_name: dept.name, deadline: friday.toISOString(), days_remaining: daysRemaining, submitted_count: submittedCountsMap.get(dept.id) ?? 0, total_count: empCountsMap.get(dept.id) ?? 0 };
  });
  res.json(deadlines);
});

router.get("/dashboard/chart-data", requireAuth, async (req, res): Promise<void> => {
  const weeks = Math.min(52, parseInt((req.query.weeks as string) || "8"));
  const user = req.user!;
  const weekStarts: string[] = [];
  const now = new Date();
  for (let i = weeks - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(now.getDate() - i * 7);
    const dayOfWeek = date.getDay();
    const monday = new Date(date);
    monday.setDate(date.getDate() - ((dayOfWeek + 6) % 7));
    weekStarts.push(monday.toISOString().split("T")[0]);
  }
  const conditions = [inArray(weeklyReportsTable.week_start, weekStarts), isNull(weeklyReportsTable.deleted_at)];
  if (user.role === "department_head" && user.department_id) conditions.push(eq(weeklyReportsTable.department_id, user.department_id));
  else if (user.role === "employee") conditions.push(eq(weeklyReportsTable.employee_id, user.id));
  const stats = weekStarts.length > 0
    ? await db.select({ week_start: weeklyReportsTable.week_start, submitted: sql`count(case when ${weeklyReportsTable.status} in ('submitted', 'under_review', 'approved', 'rejected', 'needs_changes') then 1 end)`, approved: sql`count(case when ${weeklyReportsTable.status} = 'approved' then 1 end)`, rejected: sql`count(case when ${weeklyReportsTable.status} = 'rejected' then 1 end)`, late: sql`count(case when ${weeklyReportsTable.status} in ('submitted', 'under_review') and ${weeklyReportsTable.submitted_at} > (${weeklyReportsTable.week_start}::date + INTERVAL '4 days' + INTERVAL '17 hours') then 1 end)` }).from(weeklyReportsTable).where(and(...conditions)).groupBy(weeklyReportsTable.week_start)
    : [];
  const statsMap = new Map(stats.map(s => [s.week_start, s]));
  const weeklyTrends = weekStarts.map(weekStr => { const s = statsMap.get(weekStr); return { label: weekStr, submitted: Number(s?.submitted ?? 0), approved: Number(s?.approved ?? 0), rejected: Number(s?.rejected ?? 0), late: Number(s?.late ?? 0) }; });
  const depts = await db.select().from(departmentsTable).where(and(isNull(departmentsTable.deleted_at), eq(departmentsTable.status, "active"))).limit(10);
  const deptIds = depts.map(d => d.id);
  const empCountsMap = new Map<string, number>();
  const subCountsMap = new Map<string, number>();
  const appCountsMap = new Map<string, number>();
  if (deptIds.length > 0) {
    const [empCounts, subCounts, appCounts] = await Promise.all([
      db.select({ department_id: employeesTable.department_id, empCount: count() }).from(employeesTable).where(and(inArray(employeesTable.department_id, deptIds), isNull(employeesTable.deleted_at))).groupBy(employeesTable.department_id),
      db.select({ department_id: weeklyReportsTable.department_id, subCount: count() }).from(weeklyReportsTable).where(and(inArray(weeklyReportsTable.department_id, deptIds), sql`${weeklyReportsTable.status} != 'draft'`, isNull(weeklyReportsTable.deleted_at))).groupBy(weeklyReportsTable.department_id),
      db.select({ department_id: weeklyReportsTable.department_id, appCount: count() }).from(weeklyReportsTable).where(and(inArray(weeklyReportsTable.department_id, deptIds), eq(weeklyReportsTable.status, "approved"), isNull(weeklyReportsTable.deleted_at))).groupBy(weeklyReportsTable.department_id),
    ]);
    empCounts.forEach(c => c.department_id && empCountsMap.set(c.department_id, Number(c.empCount)));
    subCounts.forEach(c => c.department_id && subCountsMap.set(c.department_id, Number(c.subCount)));
    appCounts.forEach(c => c.department_id && appCountsMap.set(c.department_id, Number(c.appCount)));
  }
  const deptComparison = depts.map((dept) => { const empTotal = empCountsMap.get(dept.id) ?? 0; const submitted = subCountsMap.get(dept.id) ?? 0; const approved = appCountsMap.get(dept.id) ?? 0; return { department_id: dept.id, department_name: dept.name, submitted, approved, completion_pct: empTotal > 0 ? Math.round((submitted / empTotal) * 100) : 0, total_employees: empTotal }; });
  res.json({ weekly_reports: weeklyTrends, department_comparison: deptComparison });
});

router.get("/dashboard/analytics", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const week_start = req.query.week_start as string | undefined;
  const start_date = req.query.start_date as string | undefined;
  const end_date = req.query.end_date as string | undefined;
  const status = req.query.status as string | undefined;
  let targetEmployeeId = req.query.employee_id as string | undefined;
  let targetDepartmentId = req.query.department_id as string | undefined;

  if (user.role === "employee") {
    targetEmployeeId = user.id;
    targetDepartmentId = user.department_id || undefined;
  } else if (user.role === "department_head" && user.department_id) {
    targetDepartmentId = user.department_id;
    if (targetEmployeeId) {
      const [emp] = await db.select({ department_id: employeesTable.department_id }).from(employeesTable).where(and(eq(employeesTable.id, targetEmployeeId), isNull(employeesTable.deleted_at))).limit(1);
      if (!emp || emp.department_id !== user.department_id) targetEmployeeId = undefined;
    }
  }

  const now = new Date();
  const currentDay = now.getDay();
  const mondayOffset = (currentDay === 0 ? -6 : 1) - currentDay;
  const currentMonday = new Date(now);
  currentMonday.setDate(now.getDate() + mondayOffset);
  const weeksList: string[] = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(currentMonday);
    d.setDate(currentMonday.getDate() - i * 7);
    weeksList.push(d.toISOString().split("T")[0]);
  }
  const selectedWeek = week_start || currentMonday.toISOString().split("T")[0];

  const empFilter = targetEmployeeId ? eq(weeklyReportsTable.employee_id, targetEmployeeId) : sql`1=1`;
  const deptFilter = targetDepartmentId ? eq(weeklyReportsTable.department_id, targetDepartmentId) : sql`1=1`;
  const empEmpFilter = targetDepartmentId ? eq(employeesTable.department_id, targetDepartmentId) : sql`1=1`;
  const empIdFilter = targetEmployeeId ? eq(employeesTable.id, targetEmployeeId) : sql`1=1`;

  let weekRangeSql: any;
  if (week_start) weekRangeSql = eq(weeklyReportsTable.week_start, week_start);
  else if (start_date && end_date) weekRangeSql = sql`${weeklyReportsTable.week_start} >= ${start_date} AND ${weeklyReportsTable.week_start} <= ${end_date}`;
  else weekRangeSql = eq(weeklyReportsTable.week_start, selectedWeek);

  const statusFilter = status ? eq(weeklyReportsTable.status, status as any) : sql`1=1`;

  // All batched in parallel — ~15 DB queries total
  const [
    empCountRes, deptCountRes, activeDepts, activeEmployees,
    reportsForStats, allReportsForTimeline,
    empCountsByDept, subCountsByDept, appCountsByDept, pendingCountsByDept,
    deptWeeklyRaw, weeklyTrendRaw, monthlyTrendRaw,
  ] = await Promise.all([
    db.select({ c: count() }).from(employeesTable).where(and(isNull(employeesTable.deleted_at), eq(employeesTable.status, "active"), empEmpFilter, empIdFilter)),
    db.select({ c: count() }).from(departmentsTable).where(and(isNull(departmentsTable.deleted_at), eq(departmentsTable.status, "active"), targetDepartmentId ? eq(departmentsTable.id, targetDepartmentId) : sql`1=1`)),
    db.select({ id: departmentsTable.id, name: departmentsTable.name }).from(departmentsTable).where(and(isNull(departmentsTable.deleted_at), eq(departmentsTable.status, "active"))),
    db.select({ id: employeesTable.id, name: employeesTable.name, email: employeesTable.email, photo_url: employeesTable.photo_url, department_id: employeesTable.department_id }).from(employeesTable).where(and(isNull(employeesTable.deleted_at), eq(employeesTable.status, "active"), empEmpFilter, empIdFilter)),
    db.select({ status: weeklyReportsTable.status, overall_progress: weeklyReportsTable.overall_progress }).from(weeklyReportsTable).where(and(isNull(weeklyReportsTable.deleted_at), empFilter, deptFilter, weekRangeSql, statusFilter)),
    db.select({ employee_id: weeklyReportsTable.employee_id, week_start: weeklyReportsTable.week_start, status: weeklyReportsTable.status, overall_progress: weeklyReportsTable.overall_progress }).from(weeklyReportsTable).where(and(isNull(weeklyReportsTable.deleted_at), empFilter, deptFilter)),
    db.select({ department_id: employeesTable.department_id, c: count() }).from(employeesTable).where(and(isNull(employeesTable.deleted_at), eq(employeesTable.status, "active"))).groupBy(employeesTable.department_id),
    db.select({ department_id: weeklyReportsTable.department_id, c: count() }).from(weeklyReportsTable).where(and(isNull(weeklyReportsTable.deleted_at), eq(weeklyReportsTable.week_start, selectedWeek), sql`${weeklyReportsTable.status} != 'draft'`)).groupBy(weeklyReportsTable.department_id),
    db.select({ department_id: weeklyReportsTable.department_id, c: count() }).from(weeklyReportsTable).where(and(isNull(weeklyReportsTable.deleted_at), eq(weeklyReportsTable.week_start, selectedWeek), eq(weeklyReportsTable.status, "approved"))).groupBy(weeklyReportsTable.department_id),
    db.select({ department_id: weeklyReportsTable.department_id, c: count() }).from(weeklyReportsTable).where(and(isNull(weeklyReportsTable.deleted_at), eq(weeklyReportsTable.week_start, selectedWeek), inArray(weeklyReportsTable.status, ["submitted", "under_review"]))).groupBy(weeklyReportsTable.department_id),
    db.select({ department_id: weeklyReportsTable.department_id, week_start: weeklyReportsTable.week_start, c: sql<number>`count(case when ${weeklyReportsTable.status} != 'draft' then 1 end)` }).from(weeklyReportsTable).where(and(isNull(weeklyReportsTable.deleted_at), inArray(weeklyReportsTable.week_start, weeksList))).groupBy(weeklyReportsTable.department_id, weeklyReportsTable.week_start),
    db.select({ week_start: weeklyReportsTable.week_start, submitted: sql<number>`count(case when ${weeklyReportsTable.status} != 'draft' then 1 end)`, approved: sql<number>`count(case when ${weeklyReportsTable.status} = 'approved' then 1 end)`, rejected: sql<number>`count(case when ${weeklyReportsTable.status} = 'rejected' then 1 end)`, late: sql<number>`count(case when ${weeklyReportsTable.status} in ('submitted','under_review') and ${weeklyReportsTable.submitted_at} > (${weeklyReportsTable.week_start}::date + interval '4 days' + interval '17 hours') then 1 end)` }).from(weeklyReportsTable).where(and(isNull(weeklyReportsTable.deleted_at), inArray(weeklyReportsTable.week_start, weeksList), empFilter, deptFilter)).groupBy(weeklyReportsTable.week_start),
    db.select({ month: sql<string>`to_char(${weeklyReportsTable.week_start}::date, 'Mon YY')`, month_order: sql<string>`to_char(${weeklyReportsTable.week_start}::date, 'YYYY-MM')`, submitted: sql<number>`count(case when ${weeklyReportsTable.status} != 'draft' then 1 end)`, approved: sql<number>`count(case when ${weeklyReportsTable.status} = 'approved' then 1 end)`, rejected: sql<number>`count(case when ${weeklyReportsTable.status} = 'rejected' then 1 end)` }).from(weeklyReportsTable).where(and(isNull(weeklyReportsTable.deleted_at), empFilter, deptFilter, sql`${weeklyReportsTable.week_start}::date >= NOW() - interval '6 months'`)).groupBy(sql`to_char(${weeklyReportsTable.week_start}::date, 'Mon YY'), to_char(${weeklyReportsTable.week_start}::date, 'YYYY-MM')`).orderBy(sql`to_char(${weeklyReportsTable.week_start}::date, 'YYYY-MM')`),
  ]);

  // Aggregate stats
  const totalEmployees = Number(empCountRes[0].c);
  const activeDepartments = Number(deptCountRes[0].c);
  let draftCount = 0, submittedCount = 0, underReviewCount = 0, approvedCount = 0, rejectedCount = 0, needsChangesCount = 0, totalProgressSum = 0, reportsWithProgressCount = 0;
  reportsForStats.forEach(r => {
    if (r.status === "draft") draftCount++;
    else if (r.status === "submitted") submittedCount++;
    else if (r.status === "under_review") underReviewCount++;
    else if (r.status === "approved") approvedCount++;
    else if (r.status === "rejected") rejectedCount++;
    else if (r.status === "needs_changes") needsChangesCount++;
    if (r.status !== "draft") { totalProgressSum += r.overall_progress; reportsWithProgressCount++; }
  });
  const totalSubmitted = submittedCount + underReviewCount + approvedCount + rejectedCount + needsChangesCount;
  const pendingReports = submittedCount + underReviewCount;
  const submissionRatePct = totalEmployees > 0 ? Math.round((totalSubmitted / totalEmployees) * 100) : 0;
  const approvalRatePct = totalSubmitted > 0 ? Math.round((approvedCount / totalSubmitted) * 100) : 0;
  const overallCompanyProgress = reportsWithProgressCount > 0 ? Math.round(totalProgressSum / reportsWithProgressCount) : 0;

  // Dept lookup maps
  const deptEmpMap = new Map(empCountsByDept.map(c => [c.department_id, Number(c.c)]));
  const deptSubMap = new Map(subCountsByDept.map(c => [c.department_id, Number(c.c)]));
  const deptAppMap = new Map(appCountsByDept.map(c => [c.department_id, Number(c.c)]));
  const deptPendingMap = new Map(pendingCountsByDept.map(c => [c.department_id, Number(c.c)]));
  const deptWeekMap = new Map<string, Map<string, number>>();
  deptWeeklyRaw.forEach(r => {
    if (!r.department_id) return;
    if (!deptWeekMap.has(r.department_id)) deptWeekMap.set(r.department_id, new Map());
    deptWeekMap.get(r.department_id)!.set(r.week_start, Number(r.c));
  });

  let completedDeptsCount = 0;
  const filteredActiveDepts = targetDepartmentId ? activeDepts.filter(d => d.id === targetDepartmentId) : activeDepts;
  const deptDetails = filteredActiveDepts.map(d => {
    const empCount = deptEmpMap.get(d.id) ?? 0;
    const submitted = deptSubMap.get(d.id) ?? 0;
    const appCount = deptAppMap.get(d.id) ?? 0;
    const pending = deptPendingMap.get(d.id) ?? 0;
    const completionPct = empCount > 0 ? Math.min(100, Math.round((submitted / empCount) * 100)) : 0;
    if (completionPct >= 100 && empCount > 0) completedDeptsCount++;
    const appRate = submitted > 0 ? Math.round((appCount / submitted) * 100) : 0;
    return { department_id: d.id, department_name: d.name, total_employees: empCount, reports_submitted: submitted, pending_reports: pending, approval_rate: appRate, completion_percentage: completionPct, weekly_performance_trend: weeksList.map(w => ({ week: w, submitted: deptWeekMap.get(d.id)?.get(w) ?? 0 })) };
  });
  const departmentCompletionRate = activeDepts.length > 0 ? Math.round((completedDeptsCount / activeDepts.length) * 100) : 0;

  // Employee details
  const reportsByEmp = new Map<string, typeof allReportsForTimeline>();
  allReportsForTimeline.forEach(r => {
    if (!reportsByEmp.has(r.employee_id)) reportsByEmp.set(r.employee_id, []);
    reportsByEmp.get(r.employee_id)!.push(r);
  });
  const employeeDetails = activeEmployees.map(emp => {
    const empReports = reportsByEmp.get(emp.id) ?? [];
    const submittedReports = empReports.filter(r => r.status !== "draft");
    const approvedReports = empReports.filter(r => r.status === "approved");
    const submittedWeeks = new Set(submittedReports.map(r => r.week_start));
    const missedWeeks = weeksList.filter(w => !submittedWeeks.has(w));
    const timeline = weeksList.map(wStart => { const r = empReports.find(rr => rr.week_start === wStart); return { week: wStart, status: r?.status || "missing", progress: r?.overall_progress ?? 0 }; });
    return { employee_id: emp.id, employee_name: emp.name, email: emp.email, photo_url: emp.photo_url, submission_count: submittedReports.length, approval_count: approvedReports.length, missed_reports_count: missedWeeks.length, missed_weeks: missedWeeks, weekly_progress: timeline.map(t => ({ week: t.week, progress: t.progress })), status_timeline: timeline };
  });

  // Charts
  const trendMap = new Map(weeklyTrendRaw.map(r => [r.week_start, r]));
  const weeklyTrends = weeksList.map(w => { const r = trendMap.get(w); return { label: w, submitted: Number(r?.submitted ?? 0), approved: Number(r?.approved ?? 0), rejected: Number(r?.rejected ?? 0), late: Number(r?.late ?? 0) }; });
  const monthlyTrends = monthlyTrendRaw.map(r => ({ label: r.month, submitted: Number(r.submitted), approved: Number(r.approved), rejected: Number(r.rejected) }));
  const statusDistribution = [{ name: "Approved", value: approvedCount }, { name: "Pending", value: pendingReports }, { name: "Rejected", value: rejectedCount }, { name: "Draft", value: draftCount }, { name: "Needs Changes", value: needsChangesCount }];

  res.json({
    stats: { total_employees: totalEmployees, active_departments: activeDepartments, reports_submitted: totalSubmitted, pending_reports: pendingReports, approved_reports: approvedCount, rejected_reports: rejectedCount, draft_reports: draftCount, needs_changes_reports: needsChangesCount, submission_rate_pct: submissionRatePct, approval_rate_pct: approvalRatePct, department_completion_rate: departmentCompletionRate, overall_company_progress: overallCompanyProgress },
    departments: deptDetails,
    employees: employeeDetails,
    charts: { weekly_submission_trend: weeklyTrends, department_completion: deptDetails.map(d => ({ department_id: d.department_id, department_name: d.department_name, total_employees: d.total_employees, submitted: d.reports_submitted, completion_pct: d.completion_percentage })), status_distribution: statusDistribution, approval_vs_pending: [{ name: "Approved", count: approvedCount }, { name: "Pending", count: pendingReports }], monthly_trends: monthlyTrends },
  });
});

export default router;
