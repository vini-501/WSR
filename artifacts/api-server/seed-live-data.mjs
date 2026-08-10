/**
 * Live Data Seeder — Populates workflow logs, email logs, AI summaries, escalations
 * Run: node scripts/seed-live-data.mjs
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://mwcyapbaedfsjmetnauf.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13Y3lhcGJhZWRmc2ptZXRuYXVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDQ0MDk2MywiZXhwIjoyMTAwMDE2OTYzfQ.PBwjcbatMfS7NSB9zzyVxcfXmP8JiKOOAgLXmFKZYLk";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function hoursAgo(n) {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d.toISOString();
}

function mondayOf(weeksAgo = 0) {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff - weeksAgo * 7));
  return monday.toISOString().split("T")[0];
}

async function seedWorkflowLogs() {
  console.log("Seeding workflow execution logs...");

  // Fetch workflow IDs
  const { data: workflows } = await supabase.from("workflows").select("id, name, code");
  if (!workflows?.length) { console.log("  No workflows found, skipping"); return; }

  const wfMap = {};
  workflows.forEach(w => { wfMap[w.code] = w; });

  const entries = [
    // Weekly reminder - successful runs (last 4 weeks Fridays)
    ...Array.from({ length: 4 }, (_, i) => ({
      workflow_id: wfMap["weekly_reminder"]?.id,
      workflow_name: "Weekly Submission Reminder",
      trigger_source: "scheduled_cron",
      status: "success",
      start_time: daysAgo(i * 7 + (new Date().getDay() === 5 ? 0 : (5 - new Date().getDay()) % 7)),
      end_time: daysAgo(i * 7),
      execution_time_ms: Math.floor(Math.random() * 800) + 400,
      retry_count: 0,
      payload: { recipients: 7, emails_sent: 7, week: mondayOf(i) },
    })),

    // Dept Review Alert — runs when reports submitted
    ...Array.from({ length: 8 }, (_, i) => ({
      workflow_id: wfMap["dept_review_alert"]?.id,
      workflow_name: "Department Head Review Alert",
      trigger_source: "event",
      status: i === 3 ? "failed" : "success",
      start_time: hoursAgo(i * 6 + 2),
      end_time: hoursAgo(i * 6 + 1),
      execution_time_ms: i === 3 ? 5000 : Math.floor(Math.random() * 300) + 120,
      retry_count: i === 3 ? 2 : 0,
      error_details: i === 3 ? "SMTP connection timeout - retry scheduled" : null,
      payload: { report_id: `rpt-${i}`, employee: `Employee ${i + 1}`, department: "Engineering" },
    })),

    // AI Executive Summary — weekly
    ...Array.from({ length: 3 }, (_, i) => ({
      workflow_id: wfMap["ai_executive_summary"]?.id,
      workflow_name: "AI Executive Summary Generator",
      trigger_source: "scheduled_cron",
      status: "success",
      start_time: daysAgo(i * 7 + 2),
      end_time: daysAgo(i * 7 + 1),
      execution_time_ms: Math.floor(Math.random() * 3000) + 2000,
      retry_count: 0,
      payload: { reports_processed: Math.floor(Math.random() * 5) + 12, week: mondayOf(i + 1) },
    })),

    // Executive Digest — Mondays
    ...Array.from({ length: 3 }, (_, i) => ({
      workflow_id: wfMap["executive_digest"]?.id,
      workflow_name: "Executive Digest Email Dispatcher",
      trigger_source: "scheduled_cron",
      status: i === 2 ? "failed" : "success",
      start_time: daysAgo(i * 7 + 1),
      end_time: daysAgo(i * 7),
      execution_time_ms: i === 2 ? 8000 : Math.floor(Math.random() * 500) + 600,
      retry_count: i === 2 ? 1 : 0,
      error_details: i === 2 ? "AI provider rate limit — fallback template used" : null,
      payload: { recipients: 3, digest_type: "weekly_executive" },
    })),

    // Overdue escalation
    ...Array.from({ length: 2 }, (_, i) => ({
      workflow_id: wfMap["overdue_escalation"]?.id,
      workflow_name: "Overdue Report Escalation Engine",
      trigger_source: "scheduled_cron",
      status: "success",
      start_time: daysAgo(i * 7 + 4),
      end_time: daysAgo(i * 7 + 3),
      execution_time_ms: Math.floor(Math.random() * 400) + 200,
      retry_count: 0,
      payload: { overdue_employees: Math.floor(Math.random() * 2) + 1, escalation_level: 1 },
    })),
  ];

  for (const entry of entries) {
    if (!entry.workflow_id) continue;
    const { error } = await supabase.from("workflow_logs").insert(entry);
    if (error) console.log("  Insert error:", error.message);
  }
  console.log(`  ✓ Inserted ${entries.filter(e => e.workflow_id).length} workflow log entries`);
}

async function seedEmailLogs() {
  console.log("Seeding email delivery logs...");

  const employees = [
    { email: "admin@ellipsonic.com", name: "Enterprise Admin" },
    { email: "management@ellipsonic.com", name: "Executive Manager" },
    { email: "head@ellipsonic.com", name: "Sarah Jenkins" },
    { email: "employee@ellipsonic.com", name: "Alex Rivera" },
    { email: "priya.sharma@ellipsonic.com", name: "Priya Sharma" },
    { email: "marcus.chen@ellipsonic.com", name: "Marcus Chen" },
    { email: "isabella.torres@ellipsonic.com", name: "Isabella Torres" },
  ];

  const templates = [
    { trigger: "weekly_reminder", subject: "⏰ WCR Reminder: Submit Your Weekly Report", status: "sent" },
    { trigger: "report_approved", subject: "✅ Your Weekly Report Has Been Approved", status: "sent" },
    { trigger: "dept_completion", subject: "📊 Weekly Department Completion Summary - Engineering", status: "sent" },
    { trigger: "executive_summary", subject: "🧠 Executive AI Digest — Week of " + mondayOf(1), status: "sent" },
    { trigger: "overdue_reminder", subject: "⚠️ Action Required: Weekly Report Overdue", status: "sent" },
    { trigger: "report_rejected", subject: "🔄 Revision Requested: Your Weekly Report", status: "sent" },
    { trigger: "submission_confirmation", subject: "📋 Report Submitted Successfully", status: "sent" },
    { trigger: "welcome_email", subject: "🎉 Welcome to Ellipsonic OpsHub!", status: "sent" },
    { trigger: "dept_head_review", subject: "👁 New Report Awaiting Your Review", status: "sent" },
    { trigger: "weekly_reminder", subject: "⏰ WCR Reminder: Submit Your Weekly Report", status: "failed" },
    { trigger: "executive_summary", subject: "🧠 Executive AI Digest — Week of " + mondayOf(2), status: "sent" },
    { trigger: "overdue_reminder", subject: "⚠️ URGENT: Report 5 Days Overdue", status: "sent" },
    { trigger: "report_approved", subject: "✅ Your Weekly Report Has Been Approved", status: "sent" },
    { trigger: "pending_approval_summary", subject: "📋 3 Reports Pending Your Review", status: "sent" },
    { trigger: "dept_completion", subject: "📊 Weekly Department Completion Summary - Product", status: "sent" },
  ];

  const logEntries = templates.map((t, i) => ({
    recipient: employees[i % employees.length].email,
    subject: t.subject,
    trigger_event: t.trigger,
    status: t.status,
    error_details: t.status === "failed" ? "SMTP 550: Temporary delivery failure - mailbox unavailable" : null,
    metadata: {
      employee_name: employees[i % employees.length].name,
      template: t.trigger,
      attempt: t.status === "failed" ? 3 : 1,
    },
    sent_at: hoursAgo(i * 4 + 1),
    created_at: hoursAgo(i * 4 + 1),
  }));

  for (const entry of logEntries) {
    const { error } = await supabase.from("email_logs").insert(entry);
    if (error) console.log("  Insert error:", error.message);
  }
  console.log(`  ✓ Inserted ${logEntries.length} email log entries`);
}

async function seedAISummaries() {
  console.log("Seeding AI executive summaries...");

  for (let i = 0; i < 3; i++) {
    const week = mondayOf(i);
    const completionRate = Math.floor(Math.random() * 15) + 78;
    const healthScore = Math.floor(completionRate * 0.9 + Math.random() * 10);

    const summary = {
      type: "executive",
      target_id: "company",
      reporting_week: week,
      ai_provider_used: i === 0 ? "openai" : "system_engine",
      ai_model_used: i === 0 ? "gpt-4o" : "heuristic_v1",
      version: 1,
      summary_data: {
        health_score: healthScore,
        completion_rate: completionRate,
        total_reports: 7,
        submitted_reports: Math.floor(7 * completionRate / 100),
        approved_reports: Math.floor(7 * completionRate / 100) - 1,
        departments_reviewed: 5,
        avg_blockers_per_report: Math.floor(Math.random() * 2),
        executive_summary: `Week of ${week} — Ellipsonic maintained strong reporting discipline with a ${completionRate}% submission rate across all departments. Engineering and DevOps teams demonstrated exceptional consistency, meeting all weekly reporting deadlines. The Product Management team flagged three strategic blockers related to external API integration timelines that require executive attention. AI health score of ${healthScore}/100 reflects a ${healthScore > 85 ? "high-performing" : "stable"} operational baseline.`,
        key_achievements: [
          `${completionRate}% company-wide report submission rate achieved`,
          "Engineering team delivered Q3 roadmap milestone ahead of schedule",
          "DevOps infrastructure migration completed with zero downtime",
          "3 new employee onboarding workflows automated this week",
        ],
        blockers: i === 0 ? [
          "External payment API partner delayed integration by 2 weeks",
          "Senior DevOps engineer on medical leave — coverage plan activated",
        ] : [
          "QA bandwidth bottleneck — 2 open requisitions in pipeline",
        ],
        action_items: [
          "Executive review of Q3 budget reallocation proposal by Friday",
          "Approve 2x DevOps contractor positions for capacity gap",
          "Schedule all-hands on new AI reporting initiative (WCR v2)",
        ],
        department_scores: [
          { department: "Engineering", score: Math.floor(Math.random() * 10) + 87, submitted: 3, total: 3 },
          { department: "Product Management", score: Math.floor(Math.random() * 15) + 72, submitted: 2, total: 3 },
          { department: "Quality Assurance", score: Math.floor(Math.random() * 10) + 80, submitted: 1, total: 1 },
          { department: "DevOps & Infrastructure", score: Math.floor(Math.random() * 8) + 89, submitted: 1, total: 1 },
          { department: "Operations", score: Math.floor(Math.random() * 12) + 75, submitted: 2, total: 2 },
        ],
        trend: i === 0 ? "improving" : i === 1 ? "stable" : "declining",
        generated_at: hoursAgo(i * 72),
      },
      created_at: hoursAgo(i * 72),
      updated_at: hoursAgo(i * 72),
    };

    // Check if already exists
    const { data: existing } = await supabase
      .from("ai_summaries")
      .select("id")
      .eq("type", "executive")
      .eq("target_id", "company")
      .eq("reporting_week", week)
      .limit(1);

    if (!existing?.length) {
      const { error } = await supabase.from("ai_summaries").insert(summary);
      if (error) console.log("  AI summary insert error:", error.message);
      else console.log(`  ✓ Created AI summary for week ${week} (health: ${healthScore})`);
    } else {
      console.log(`  - AI summary for ${week} already exists, skipping`);
    }
  }
}

async function seedEscalations() {
  console.log("Seeding escalation records...");

  // Fetch employees
  const { data: emps } = await supabase
    .from("employees")
    .select("id, name, email")
    .eq("role", "employee");

  if (!emps?.length) { console.log("  No employees found, skipping"); return; }

  const escalations = emps.slice(0, 2).map((emp, i) => ({
    employee_id: emp.id,
    employee_name: emp.name,
    week_start: mondayOf(i + 1),
    level: i + 1,
    status: i === 0 ? "resolved" : "pending",
    escalated_to_name: "Sarah Jenkins (Dept Head)",
    notes: i === 0
      ? "Employee was on approved PTO — report submitted retroactively and accepted"
      : "No response after 2 reminder emails. Escalating to management review.",
    escalated_at: daysAgo(i * 7 + 3),
    resolved_at: i === 0 ? daysAgo(i * 7 + 1) : null,
  }));

  for (const esc of escalations) {
    const { error } = await supabase.from("escalations").insert(esc);
    if (error && !error.message.includes("duplicate")) console.log("  Escalation error:", error.message);
  }
  console.log(`  ✓ Inserted ${escalations.length} escalation records`);
}

async function main() {
  console.log("\n🌱 Starting live data seeding...\n");
  await seedWorkflowLogs();
  await seedEmailLogs();
  await seedAISummaries();
  await seedEscalations();
  console.log("\n✅ Live data seeding complete!\n");
  process.exit(0);
}

main().catch(err => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
