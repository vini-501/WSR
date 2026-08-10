import {
  db,
  departmentsTable,
  employeesTable,
  weeklyReportsTable,
  notificationsTable,
  emailLogsTable,
  workflowLogsTable,
  escalationsTable,
  aiSummariesTable,
  workflowsTable,
  type AISummaryData,
} from "@workspace/db";
import { eq, and, isNull, or } from "drizzle-orm";
import { seedDefaultWorkflows } from "../lib/workflowEngine";

export async function seedComprehensiveEnterpriseData() {
  console.log("Starting comprehensive enterprise data seeding for OpsHub...");

  // 1. Seed Workflows
  await seedDefaultWorkflows();

  // 2. Ensure Departments
  const deptData = [
    { name: "Engineering", description: "Core platform development, backend infrastructure, and web applications" },
    { name: "Product Management", description: "Product strategy, roadmap planning, and UX research" },
    { name: "Quality Assurance", description: "Automated testing, release verification, and quality metrics" },
    { name: "DevOps & Infrastructure", description: "Cloud infrastructure, CI/CD pipelines, and SRE operations" },
    { name: "Operations", description: "Business operations, staff deployment, and compliance monitoring" },
  ];

  const depts: Record<string, any> = {};
  for (const d of deptData) {
    let [existing] = await db
      .select()
      .from(departmentsTable)
      .where(eq(departmentsTable.name, d.name))
      .limit(1);

    if (!existing) {
      [existing] = await db
        .insert(departmentsTable)
        .values({
          name: d.name,
          description: d.description,
        })
        .returning();
    }
    depts[d.name] = existing;
  }

  // 3. Ensure Core Employees across all key roles
  const employeeData = [
    {
      email: "admin@ellipsonic.com",
      role: "admin" as const,
      name: "Enterprise Admin",
      employee_id: "EMP-001",
      designation: "Chief Technology Officer",
      department: "Engineering",
      phone: "+1 (555) 019-2831",
      joining_date: "2023-01-15",
    },
    {
      email: "management@ellipsonic.com",
      role: "management" as const,
      name: "Executive Manager",
      employee_id: "EMP-002",
      designation: "VP of Operations",
      department: "Operations",
      phone: "+1 (555) 014-9823",
      joining_date: "2023-02-01",
    },
    {
      email: "head@ellipsonic.com",
      role: "department_head" as const,
      name: "Sarah Jenkins",
      employee_id: "EMP-003",
      designation: "VP of Software Engineering",
      department: "Engineering",
      phone: "+1 (555) 018-7721",
      joining_date: "2023-03-10",
    },
    {
      email: "employee@ellipsonic.com",
      role: "employee" as const,
      name: "Alex Rivera",
      employee_id: "EMP-004",
      designation: "Senior Staff Engineer",
      department: "Engineering",
      phone: "+1 (555) 012-3456",
      joining_date: "2023-04-01",
    },
    {
      email: "pm.lead@ellipsonic.com",
      role: "department_head" as const,
      name: "Michael Chang",
      employee_id: "EMP-005",
      designation: "Director of Product Management",
      department: "Product Management",
      phone: "+1 (555) 017-4412",
      joining_date: "2023-05-12",
    },
    {
      email: "qa.head@ellipsonic.com",
      role: "department_head" as const,
      name: "Elena Rostova",
      employee_id: "EMP-006",
      designation: "Head of QA & Test Automation",
      department: "Quality Assurance",
      phone: "+1 (555) 019-3388",
      joining_date: "2023-06-01",
    },
    {
      email: "pm.employee@ellipsonic.com",
      role: "employee" as const,
      name: "Sophia Patel",
      employee_id: "EMP-007",
      designation: "Lead Product Manager",
      department: "Product Management",
      phone: "+1 (555) 016-5599",
      joining_date: "2023-05-20",
    },
    {
      email: "devops.lead@ellipsonic.com",
      role: "department_head" as const,
      name: "David Miller",
      employee_id: "EMP-008",
      designation: "Director of Infrastructure & SRE",
      department: "DevOps & Infrastructure",
      phone: "+1 (555) 013-8821",
      joining_date: "2023-06-15",
    },
  ];

  const empMap: Record<string, any> = {};

  for (const emp of employeeData) {
    let [existing] = await db
      .select()
      .from(employeesTable)
      .where(or(eq(employeesTable.email, emp.email), eq(employeesTable.employee_id, emp.employee_id)))
      .limit(1);

    const deptObj = depts[emp.department];

    if (!existing) {
      [existing] = await db
        .insert(employeesTable)
        .values({
          auth_user_id: `auth-${emp.employee_id.toLowerCase()}`,
          employee_id: emp.employee_id,
          name: emp.name,
          email: emp.email,
          role: emp.role,
          designation: emp.designation,
          department_id: deptObj ? deptObj.id : null,
          phone: emp.phone,
          status: "active",
          joining_date: emp.joining_date,
        })
        .returning();
    } else {
      [existing] = await db
        .update(employeesTable)
        .set({
          name: emp.name,
          email: emp.email,
          role: emp.role,
          designation: emp.designation,
          department_id: deptObj ? deptObj.id : null,
          status: "active",
        })
        .where(eq(employeesTable.id, existing.id))
        .returning();
    }

    empMap[emp.email] = existing;

    if (emp.role === "department_head" && deptObj) {
      await db
        .update(departmentsTable)
        .set({ head_id: existing.id })
        .where(eq(departmentsTable.id, deptObj.id));
    }
  }

  // 4. Seed Weekly Reports
  // Current Monday: 2026-07-27, Previous Mondays: 2026-07-20, 2026-07-13, 2026-07-06
  const weeks = ["2026-07-27", "2026-07-20", "2026-07-13", "2026-07-06"];

  for (let wIdx = 0; wIdx < weeks.length; wIdx++) {
    const weekStart = weeks[wIdx];
    const isCurrentWeek = wIdx === 0;

    for (const empEmail of Object.keys(empMap)) {
      const emp = empMap[empEmail];
      if (!emp) continue;

      let reportStatus: "draft" | "submitted" | "approved" = "approved";
      let achievements = "• Completed core weekly deliverables on schedule.\n• Optimized database query latency by 45%.\n• Implemented real-time notification triggers.";
      let completedTasks = "• Built AuthContext Supabase auth persistence\n• Configured n8n webhook dispatches";
      let ongoingTasks = "• Enterprise UAT testing and audit log integration";
      let blockers = "";
      let nextWeekPlans = "• Complete production audit and operational manual walkthrough";
      let progress = 95;

      if (isCurrentWeek) {
        if (emp.email === "employee@ellipsonic.com") {
          // Alex Rivera: Draft report ready to edit & submit
          reportStatus = "draft";
          achievements = "• Drafted baseline benchmark suite for microservices.\n• Refactored API authentication middleware.";
          completedTasks = "• Setup TypeScript monorepo build scripts\n• Added local simulated fallback engines";
          ongoingTasks = "• Completing weekly report submission and manager approval review.";
          blockers = "";
          nextWeekPlans = "• Finalize production deployment verification and load testing.";
          progress = 80;
        } else if (emp.email === "pm.employee@ellipsonic.com") {
          // Sophia Patel: Submitted report ready for Manager / Dept Head approval
          reportStatus = "submitted";
          achievements = "• Conducted Q3 product strategy sync with department leads.\n• Finalized UX specs for Executive Insights AI dashboard.";
          completedTasks = "• Published user feedback summary report\n• Validated n8n automation workflow dispatches";
          ongoingTasks = "• Preparing executive summary roundup for management review.";
          blockers = "Awaiting final sign-off on third-party API integration quota limits.";
          nextWeekPlans = "• Launch internal beta feedback loop for department heads.";
          progress = 90;
        } else {
          reportStatus = "approved";
          progress = 92;
        }
      }

      const [existingReport] = await db
        .select()
        .from(weeklyReportsTable)
        .where(
          and(
            eq(weeklyReportsTable.employee_id, emp.id),
            eq(weeklyReportsTable.week_start, weekStart),
            isNull(weeklyReportsTable.deleted_at)
          )
        )
        .limit(1);

      if (!existingReport) {
        await db.insert(weeklyReportsTable).values({
          employee_id: emp.id,
          department_id: emp.department_id,
          week_start: weekStart,
          achievements,
          completed_tasks: completedTasks,
          ongoing_tasks: ongoingTasks,
          blockers,
          next_week_plans: nextWeekPlans,
          overall_progress: progress,
          status: reportStatus,
          submitted_at: reportStatus !== "draft" ? new Date() : null,
          reviewer_id: reportStatus === "approved" ? empMap["head@ellipsonic.com"]?.id : null,
          reviewed_at: reportStatus === "approved" ? new Date() : null,
          review_comment: reportStatus === "approved" ? "Outstanding performance and deliverables. Approved." : null,
        });
      }
    }
  }

  // 5. Seed Notifications
  const sampleNotifications = [
    {
      user_id: empMap["employee@ellipsonic.com"]?.id,
      type: "approval" as const,
      title: "Weekly Report Approved",
      message: "Your weekly report for week 2026-07-20 was approved by Sarah Jenkins.",
      is_read: false,
    },
    {
      user_id: empMap["head@ellipsonic.com"]?.id,
      type: "reminder" as const,
      title: "Pending Report Approvals",
      message: "You have 1 pending weekly report awaiting review for department Engineering & Product.",
      is_read: false,
    },
    {
      user_id: empMap["management@ellipsonic.com"]?.id,
      type: "announcement" as const,
      title: "AI Executive Summary Generated",
      message: "Executive AI Summary for week 2026-07-20 is ready for executive review. Health Score: EXCELLENT.",
      is_read: true,
    },
  ];

  for (const notif of sampleNotifications) {
    if (!notif.user_id) continue;
    const [existing] = await db
      .select()
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.user_id, notif.user_id),
          eq(notificationsTable.title, notif.title)
        )
      )
      .limit(1);

    if (!existing) {
      await db.insert(notificationsTable).values(notif);
    }
  }

  // 6. Seed Sample Email Logs
  const sampleEmails = [
    {
      recipient: "admin@ellipsonic.com",
      subject: "Weekly AI Executive Digest - Week of 2026-07-20",
      trigger_event: "executive_summary",
      status: "sent",
      error_details: null,
      metadata: { weekStart: "2026-07-20", healthScore: "Excellent" },
    },
    {
      recipient: "management@ellipsonic.com",
      subject: "Weekly AI Executive Digest - Week of 2026-07-20",
      trigger_event: "executive_summary",
      status: "sent",
      error_details: null,
      metadata: { weekStart: "2026-07-20", healthScore: "Excellent" },
    },
    {
      recipient: "employee@ellipsonic.com",
      subject: "Reminder: Weekly WCR Submission Due Friday 10:00 AM",
      trigger_event: "weekly_reminder",
      status: "sent",
      error_details: null,
      metadata: { weekStart: "2026-07-27" },
    },
    {
      recipient: "head@ellipsonic.com",
      subject: "Report Approval Confirmation: Alex Rivera (Engineering)",
      trigger_event: "report_approved",
      status: "sent",
      error_details: null,
      metadata: { reportId: "approved-sample" },
    },
  ];

  for (const em of sampleEmails) {
    const [existing] = await db
      .select()
      .from(emailLogsTable)
      .where(
        and(
          eq(emailLogsTable.recipient, em.recipient),
          eq(emailLogsTable.subject, em.subject)
        )
      )
      .limit(1);

    if (!existing) {
      await db.insert(emailLogsTable).values(em);
    }
  }

  // 7. Seed Sample Workflow Execution Logs
  const allWorkflows = await db.select().from(workflowsTable);
  for (const wf of allWorkflows) {
    const [existingLog] = await db
      .select()
      .from(workflowLogsTable)
      .where(eq(workflowLogsTable.workflow_id, wf.id))
      .limit(1);

    if (!existingLog) {
      await db.insert(workflowLogsTable).values({
        workflow_id: wf.id,
        workflow_name: wf.name,
        trigger_source: "scheduled_cron",
        status: "success",
        start_time: new Date(Date.now() - 3600000),
        end_time: new Date(Date.now() - 3598500),
        execution_time_ms: 1500,
        retry_count: 0,
        payload: { resultMessage: `Successfully executed ${wf.name} workflow via n8n automation dispatcher.` },
      });
    }
  }

  // 8. Seed Escalation Ledger
  if (empMap["employee@ellipsonic.com"]) {
    const emp = empMap["employee@ellipsonic.com"];
    const [existingEsc] = await db
      .select()
      .from(escalationsTable)
      .where(eq(escalationsTable.employee_id, emp.id))
      .limit(1);

    if (!existingEsc) {
      await db.insert(escalationsTable).values({
        employee_id: emp.id,
        employee_name: emp.name,
        week_start: "2026-07-20",
        level: 1,
        status: "resolved",
        notes: "Level 1 Overdue Escalation: Employee submitted report following automated reminder.",
        resolved_at: new Date(),
      });
    }
  }

  // 9. Pre-seed AI Executive Summary for 2026-07-20
  const [existingAiSummary] = await db
    .select()
    .from(aiSummariesTable)
    .where(
      and(
        eq(aiSummariesTable.type, "executive"),
        eq(aiSummariesTable.target_id, "2026-07-20")
      )
    )
    .limit(1);

  if (!existingAiSummary) {
    const summaryData: AISummaryData = {
      overall_company_progress: 94,
      total_submitted: 8,
      submission_rate_pct: 100,
      approval_rate_pct: 100,
      company_health_score: "Excellent",
      productivity_score: 96,
      executive_summary_text: "For the week of 2026-07-20, all company departments achieved 100% submission and approval rates. Core engineering initiatives, product roadmap specifications, and test automation pipelines were delivered on schedule. Company health status is evaluated as EXCELLENT with zero critical blockers.",
      major_achievements: [
        "Monorepo migration and TypeScript build pipeline completed successfully.",
        "SQL database query latency optimized by 45%.",
        "n8n workflow integration & fallback automation engine verified.",
        "UX specification for Executive Insights AI dashboard published."
      ],
      key_blockers_and_risks: [
        "Awaiting third-party OAuth provider quota increase for production environment."
      ],
      high_priority_action_items: [
        "Finalize production deployment verification and load testing.",
        "Conduct executive digest roundup with management team."
      ],
      department_breakdown: [
        {
          department_id: depts["Engineering"]?.id || "dept-eng",
          department_name: "Engineering",
          completion_rate: 100,
          tasks_completed: 18,
          risks_count: 0,
          status: "On Track",
          summary: "Engineering team delivered platform refactoring and database optimizations.",
        },
        {
          department_id: depts["Product Management"]?.id || "dept-pm",
          department_name: "Product Management",
          completion_rate: 100,
          tasks_completed: 12,
          risks_count: 0,
          status: "On Track",
          summary: "Product Management completed Q3 roadmap and AI insights dashboard PRD.",
        },
        {
          department_id: depts["Quality Assurance"]?.id || "dept-qa",
          department_name: "Quality Assurance",
          completion_rate: 100,
          tasks_completed: 15,
          risks_count: 0,
          status: "On Track",
          summary: "QA team achieved 98% automated test suite pass rate across API services.",
        },
      ],
      ai_recommendations: [
        {
          category: "process",
          title: "SLA Turnaround Optimization",
          description: "Maintain current 24-hour review turnaround across all department heads.",
          impact: "High",
        },
        {
          category: "support",
          title: "Infrastructure Scaling Drive",
          description: "Provision additional database read replicas for peak weekly summary reporting hours.",
          impact: "Medium",
        },
      ],
      business_intelligence: {
        frequently_reported_blockers: ["Third-party API quota limits"],
        recurring_risks: ["Cross-team dependency bottlenecks"],
        departments_requiring_attention: [],
        delayed_projects: [],
        resource_shortages: [],
        productivity_trend: "improving",
      },
    };

    await db.insert(aiSummariesTable).values({
      type: "executive",
      target_id: "2026-07-20",
      reporting_week: "2026-07-20",
      summary_data: summaryData,
      ai_provider_used: "system_engine",
      ai_model_used: "heuristic_v1",
      version: 1,
    });
  }

  console.log("✓ Comprehensive enterprise data seeding completed successfully.");
}
