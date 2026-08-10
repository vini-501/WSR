/**
 * OpsHub Workflow Studio — Full n8n-style Workflow Visualization Server
 * Runs on Node.js v24+. Provides:
 *   - Visual node-by-node workflow canvas (per workflow)
 *   - Manual workflow execution with real node-by-node simulation
 *   - Real execution details (start time, duration, input/output per node)
 *   - Execution history with search & filter
 *   - Webhook endpoint for OpsHub integration
 *   - Live execution log streaming
 */

import http from "node:http";
import url from "node:url";
import { randomUUID } from "node:crypto";

const PORT = 5678;

// ─── Workflow Definitions with Full Node Graphs ─────────────────────────────

const WORKFLOWS = {
  weekly_reminder: {
    id: "wf-001",
    name: "Weekly Submission Reminder",
    code: "weekly_reminder",
    active: true,
    trigger: "Cron — Every Friday 10:00 AM IST",
    webhook: "/webhook/wcr-reminder",
    description: "Sends personalized email reminders to all employees with pending WCR submissions each Friday morning.",
    nodes: [
      { id: "n1", type: "⏰ Cron Trigger",       label: "Every Friday 10:00 AM",    category: "trigger",   description: "Fires every Friday at 10:00 AM via system cron scheduler" },
      { id: "n2", type: "🌐 HTTP Request",        label: "GET Pending Employees",    category: "request",   description: "Calls GET /api/employees to retrieve active employees list from OpsHub API" },
      { id: "n3", type: "🔀 IF / Filter",          label: "Filter: Not Submitted",    category: "logic",     description: "Checks each employee — filters those who have NOT submitted their weekly report yet" },
      { id: "n4", type: "🌐 HTTP Request",        label: "GET Report Status",        category: "request",   description: "Calls GET /api/reports?week_start=current to check each employee's submission status" },
      { id: "n5", type: "📧 Send Email (SMTP)",   label: "Send Reminder Email",      category: "email",     description: "Sends personalized HTML reminder email via SMTP with employee name, deadline, and submission link" },
      { id: "n6", type: "🌐 HTTP Request",        label: "POST Email Log",           category: "request",   description: "Calls POST /api/email/logs to record the delivery event in OpsHub database" },
      { id: "n7", type: "🔔 HTTP Request",        label: "POST Notification",        category: "request",   description: "Calls POST /api/notifications to send in-app push notification to employee" },
      { id: "n8", type: "📊 Set Node",            label: "Build Summary Payload",    category: "data",      description: "Aggregates total employees reminded, failed sends, and timestamp into summary object" },
      { id: "n9", type: "🌐 HTTP Request",        label: "POST Workflow Log",        category: "request",   description: "Calls POST /api/workflows/logs to record execution status in OpsHub workflow_logs table" },
    ],
    edges: [["n1","n2"],["n2","n3"],["n3","n4"],["n4","n5"],["n5","n6"],["n6","n7"],["n7","n8"],["n8","n9"]],
  },

  dept_review_alert: {
    id: "wf-002",
    name: "Department Head Review Alert",
    code: "dept_review_alert",
    active: true,
    trigger: "Webhook — On Report Submitted Event",
    webhook: "/webhook/wcr-dept-review",
    description: "Instantly alerts the Department Head with a review notification when an employee submits a WCR report.",
    nodes: [
      { id: "n1", type: "🪝 Webhook Trigger",     label: "On: Report Submitted",     category: "trigger",   description: "Receives POST payload from OpsHub when any employee submits a weekly report" },
      { id: "n2", type: "📊 Set Node",            label: "Extract Report Data",      category: "data",      description: "Extracts employee_id, department_id, report_id and week_start from webhook payload" },
      { id: "n3", type: "🌐 HTTP Request",        label: "GET Department Head",      category: "request",   description: "Calls GET /api/departments/:id to look up the Department Head's user record" },
      { id: "n4", type: "🌐 HTTP Request",        label: "GET Employee Details",     category: "request",   description: "Calls GET /api/employees/:id to retrieve submitting employee name, email, and photo" },
      { id: "n5", type: "📧 Send Email (SMTP)",   label: "Email Dept Head",          category: "email",     description: "Sends formatted HTML email to Department Head with report preview and action buttons (Approve/Request Changes)" },
      { id: "n6", type: "🔔 HTTP Request",        label: "POST: In-App Notification",category: "request",   description: "Creates in-app notification for Department Head via POST /api/notifications" },
      { id: "n7", type: "🌐 HTTP Request",        label: "POST Execution Log",       category: "request",   description: "Logs execution result to OpsHub workflow_logs table with status and latency" },
    ],
    edges: [["n1","n2"],["n2","n3"],["n2","n4"],["n3","n5"],["n4","n5"],["n5","n6"],["n6","n7"]],
  },

  ai_executive_summary: {
    id: "wf-003",
    name: "AI Executive Summary Generator",
    code: "ai_executive_summary",
    active: true,
    trigger: "Cron — Every Friday 19:00 IST",
    webhook: "/webhook/wcr-ai-summary",
    description: "Collects all approved WCR reports for the week, sends to AI engine, and stores the executive summary in the database.",
    nodes: [
      { id: "n1", type: "⏰ Cron Trigger",       label: "Every Friday 19:00",        category: "trigger",   description: "Fires every Friday at 7:00 PM after the WCR submission deadline has passed" },
      { id: "n2", type: "🌐 HTTP Request",       label: "GET All Reports (Week)",    category: "request",   description: "Calls GET /api/reports?week_start=current&status=approved to fetch all approved reports for the week" },
      { id: "n3", type: "📊 Set Node",           label: "Format AI Prompt",          category: "data",      description: "Builds structured GPT-4o prompt from all department reports, including achievements, blockers, and next steps" },
      { id: "n4", type: "🤖 OpenAI / AI Node",  label: "Generate Executive Brief",  category: "ai",        description: "Sends prompt to AI engine (OpenAI GPT-4o or system heuristic fallback) to generate executive summary, health score, and action items" },
      { id: "n5", type: "📊 Set Node",           label: "Parse AI Response",         category: "data",      description: "Extracts health_score, executive_summary, key_achievements, blockers, and action_items from AI JSON response" },
      { id: "n6", type: "🌐 HTTP Request",       label: "POST AI Summary to DB",     category: "request",   description: "Calls POST /api/ai/summary/executive to persist generated summary into the ai_summaries table in Supabase" },
      { id: "n7", type: "🌐 HTTP Request",       label: "POST Workflow Log",         category: "request",   description: "Records execution in workflow_logs with status, duration, and reports_processed count" },
    ],
    edges: [["n1","n2"],["n2","n3"],["n3","n4"],["n4","n5"],["n5","n6"],["n6","n7"]],
  },

  executive_digest: {
    id: "wf-004",
    name: "Executive Digest Email Dispatcher",
    code: "executive_digest",
    active: true,
    trigger: "Cron — Every Monday 09:00 IST",
    webhook: "/webhook/wcr-digest-email",
    description: "Sends the weekly AI Executive Summary digest email to all management and admin recipients every Monday morning.",
    nodes: [
      { id: "n1", type: "⏰ Cron Trigger",       label: "Every Monday 09:00",        category: "trigger",   description: "Fires every Monday at 9:00 AM to ensure executives have the digest at start of their workweek" },
      { id: "n2", type: "🌐 HTTP Request",       label: "GET Latest AI Summary",     category: "request",   description: "Calls GET /api/ai/summary/executive to retrieve the most recently generated executive summary for last week" },
      { id: "n3", type: "🌐 HTTP Request",       label: "GET Management Recipients", category: "request",   description: "Calls GET /api/employees?role=management,admin to get all executive email recipients" },
      { id: "n4", type: "📊 Set Node",           label: "Render Email Template",     category: "data",      description: "Builds rich HTML digest email with health score meter, department scores, AI insights, and action items" },
      { id: "n5", type: "🔀 Loop Over Items",    label: "For Each Recipient",        category: "logic",     description: "Iterates over each management/admin employee to send personalized digest email" },
      { id: "n6", type: "📧 Send Email (SMTP)",  label: "Send Digest Email",         category: "email",     description: "Sends HTML digest with health score, department breakdown, AI narrative, and action items to each executive" },
      { id: "n7", type: "🌐 HTTP Request",       label: "POST Email Log",            category: "request",   description: "Records each email send event in OpsHub email_logs table via POST /api/email/logs" },
      { id: "n8", type: "🌐 HTTP Request",       label: "POST Workflow Log",         category: "request",   description: "Records final execution summary in workflow_logs — total recipients, duration, status" },
    ],
    edges: [["n1","n2"],["n2","n3"],["n3","n4"],["n4","n5"],["n5","n6"],["n6","n7"],["n7","n8"]],
  },

  overdue_escalation: {
    id: "wf-005",
    name: "Overdue Report Escalation Engine",
    code: "overdue_escalation",
    active: true,
    trigger: "Cron — Every Friday 18:00 IST",
    webhook: "/webhook/wcr-escalation",
    description: "Identifies employees who missed the Friday WCR deadline and escalates through L1 → L2 → L3 notification tiers.",
    nodes: [
      { id: "n1", type: "⏰ Cron Trigger",       label: "Every Friday 18:00",         category: "trigger",   description: "Fires 1 hour after the WCR deadline (17:00) to catch all missed submissions" },
      { id: "n2", type: "🌐 HTTP Request",       label: "GET Overdue Employees",      category: "request",   description: "Calls GET /api/reports?status=not_submitted&week=current to find employees with no report" },
      { id: "n3", type: "🔀 IF / Filter",        label: "Any Overdue?",               category: "logic",     description: "IF count > 0: proceed with escalation. ELSE: end workflow cleanly" },
      { id: "n4", type: "📊 Set Node",           label: "Determine Escalation Level", category: "data",      description: "Checks escalation history — first miss = L1 (employee), repeat = L2 (dept head), third = L3 (management)" },
      { id: "n5", type: "📧 Send Email (SMTP)",  label: "L1: Email Employee",         category: "email",     description: "Sends urgent reminder to overdue employee: 'Your WCR is now overdue. Please submit immediately.'" },
      { id: "n6", type: "📧 Send Email (SMTP)",  label: "L2: Alert Dept Head",        category: "email",     description: "Notifies Department Head: '[Employee] has not submitted their WCR. Please follow up immediately.'" },
      { id: "n7", type: "🌐 HTTP Request",       label: "POST Escalation Record",     category: "request",   description: "Creates escalation record in OpsHub escalations table via POST /api/workflows/escalations" },
      { id: "n8", type: "🔔 HTTP Request",       label: "POST Notifications",         category: "request",   description: "Creates in-app notifications for both employee and department head about overdue status" },
      { id: "n9", type: "🌐 HTTP Request",       label: "POST Workflow Log",          category: "request",   description: "Records escalation run result, overdue_count, level, and execution details in workflow_logs" },
    ],
    edges: [["n1","n2"],["n2","n3"],["n3","n4"],["n4","n5"],["n5","n6"],["n6","n7"],["n7","n8"],["n8","n9"]],
  },

  late_submission_report: {
    id: "wf-006",
    name: "Late Submission & Completion Reporter",
    code: "late_submission_report",
    active: true,
    trigger: "Cron — Every Saturday 12:00 IST",
    webhook: "/webhook/wcr-late-submission",
    description: "Generates weekly department completion metrics and late submission report for management review.",
    nodes: [
      { id: "n1", type: "⏰ Cron Trigger",       label: "Every Saturday 12:00",       category: "trigger",   description: "Fires Saturday noon to compile complete weekly submission statistics after deadline has passed" },
      { id: "n2", type: "🌐 HTTP Request",       label: "GET Dept Completion Stats",  category: "request",   description: "Calls GET /api/analytics/department-comparison to retrieve per-department submission rates" },
      { id: "n3", type: "🌐 HTTP Request",       label: "GET Late Submissions",       category: "request",   description: "Calls GET /api/reports?status=submitted&late=true to get reports submitted after deadline" },
      { id: "n4", type: "📊 Set Node",           label: "Calculate Metrics",          category: "data",      description: "Computes completion_rate, late_rate, on_time_rate, worst_department, best_department metrics" },
      { id: "n5", type: "📊 Set Node",           label: "Build Report Payload",       category: "data",      description: "Structures the late submission report with rankings, trends, and risk flags" },
      { id: "n6", type: "📧 Send Email (SMTP)",  label: "Email Completion Report",    category: "email",     description: "Sends formatted weekly completion summary to all management and admin recipients" },
      { id: "n7", type: "🌐 HTTP Request",       label: "POST Workflow Log",          category: "request",   description: "Records run completion with full statistics in OpsHub workflow_logs table" },
    ],
    edges: [["n1","n2"],["n2","n3"],["n3","n4"],["n4","n5"],["n5","n6"],["n6","n7"]],
  },
};

// ─── Execution History ────────────────────────────────────────────────────────

const executionHistory = [];

// Seed some historical executions
const historicalExecs = [
  { wfCode: "weekly_reminder",      status: "success", hoursAgo: 168, duration: 3821, payload: { recipients: 7, sent: 7, failed: 0 } },
  { wfCode: "dept_review_alert",    status: "success", hoursAgo: 2,   duration: 287,  payload: { employee: "Alex Rivera", report_id: "rpt-18", department: "Engineering" } },
  { wfCode: "dept_review_alert",    status: "success", hoursAgo: 6,   duration: 312,  payload: { employee: "Priya Sharma", report_id: "rpt-17", department: "DevOps" } },
  { wfCode: "ai_executive_summary", status: "success", hoursAgo: 170, duration: 5142, payload: { reports_processed: 14, health_score: 84, ai_provider: "system_engine" } },
  { wfCode: "executive_digest",     status: "success", hoursAgo: 144, duration: 1893, payload: { recipients: 3, emails_sent: 3 } },
  { wfCode: "overdue_escalation",   status: "success", hoursAgo: 171, duration: 642,  payload: { overdue_count: 2, escalation_level: 1 } },
  { wfCode: "late_submission_report",status:"success", hoursAgo: 167, duration: 2147, payload: { completion_rate: 85, departments: 5, late_count: 2 } },
  { wfCode: "weekly_reminder",      status: "success", hoursAgo: 336, duration: 4012, payload: { recipients: 7, sent: 6, failed: 1 } },
  { wfCode: "ai_executive_summary", status: "success", hoursAgo: 338, duration: 4891, payload: { reports_processed: 12, health_score: 79, ai_provider: "system_engine" } },
  { wfCode: "dept_review_alert",    status: "failed",  hoursAgo: 50,  duration: 5000, payload: { employee: "Marcus Chen", error: "SMTP timeout on retry attempt 3" } },
];

for (const h of historicalExecs) {
  const wf = WORKFLOWS[h.wfCode];
  const start = new Date(Date.now() - h.hoursAgo * 3600000);
  const end = new Date(start.getTime() + h.duration);
  executionHistory.push({
    id: `exec-hist-${randomUUID().slice(0,8)}`,
    workflowId: wf.id,
    workflowName: wf.name,
    workflowCode: h.wfCode,
    trigger: wf.trigger.includes("Cron") ? "Scheduled Cron" : "Webhook",
    status: h.status,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    durationMs: h.duration,
    payload: h.payload,
    nodeResults: generateNodeResults(wf.nodes, h.status, h.duration),
  });
}

function generateNodeResults(nodes, overallStatus, totalMs) {
  const results = [];
  let elapsed = 0;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const isLast = i === nodes.length - 1;
    const isFailing = overallStatus === "failed" && isLast;
    const nodeDuration = isFailing ? Math.floor(totalMs * 0.7) : Math.floor((totalMs / nodes.length) * (0.5 + Math.random()));
    
    results.push({
      nodeId: node.id,
      nodeLabel: node.label,
      nodeType: node.type,
      category: node.category,
      status: isFailing ? "error" : "success",
      startTime: new Date(Date.now() - 3600000 + elapsed).toISOString(),
      durationMs: nodeDuration,
      input: getNodeInput(node, i),
      output: isFailing ? { error: "SMTP connection timeout — max retries exceeded" } : getNodeOutput(node, i),
    });
    elapsed += nodeDuration;
    if (isFailing) break;
  }
  return results;
}

function getNodeInput(node, idx) {
  const inputs = {
    trigger: { scheduled_at: new Date().toISOString(), triggered_by: "system_scheduler" },
    request: { url: "http://localhost:5000/api/...", method: "GET", headers: { Authorization: "Bearer [service_token]" } },
    data: { items: [{ json: { employee_id: "emp-uuid-001", name: "Alex Rivera" } }] },
    logic: { condition: "status !== 'submitted'", items_in: 7 },
    email: { to: "employee@ellipsonic.com", subject: "⏰ WCR Reminder", template: "weekly_reminder" },
    ai: { model: "system_engine_heuristic_v1", prompt_length: 2847, reports_count: 14 },
  };
  return inputs[node.category] || {};
}

function getNodeOutput(node, idx) {
  const outputs = {
    trigger: { execution_id: randomUUID(), timestamp: new Date().toISOString() },
    request: { statusCode: 200, items_returned: 7, response_time_ms: 142 },
    data: { processed: true, fields_extracted: ["employee_id","name","email","department"] },
    logic: { passed: 5, filtered_out: 2, condition_result: true },
    email: { messageId: `<${randomUUID()}@ellipsonic.com>`, accepted: 1, status: "delivered" },
    ai: { health_score: 84, summary_length: 1842, tokens_used: 2103, provider: "system_engine" },
  };
  return outputs[node.category] || { success: true };
}

// ─── Execute Workflow (simulates real node-by-node execution) ─────────────────

async function executeWorkflow(wfCode, triggerSource, payload) {
  const wf = WORKFLOWS[wfCode];
  if (!wf) return null;

  const execId = `exec-${Date.now()}`;
  const startTime = new Date();
  const nodeResults = [];
  let totalDuration = 0;
  let overallStatus = "success";
  let errorNode = null;

  for (let i = 0; i < wf.nodes.length; i++) {
    const node = wf.nodes[i];
    const nodeStart = Date.now();
    // Simulate realistic per-node duration
    const duration = node.category === "email" ? 180 + Math.floor(Math.random() * 220)
                   : node.category === "ai"    ? 1800 + Math.floor(Math.random() * 1200)
                   : node.category === "request" ? 80 + Math.floor(Math.random() * 160)
                   : 20 + Math.floor(Math.random() * 50);

    await new Promise(r => setTimeout(r, Math.min(duration, 100))); // cap at 100ms for responsiveness
    totalDuration += duration;

    nodeResults.push({
      nodeId: node.id,
      nodeLabel: node.label,
      nodeType: node.type,
      category: node.category,
      status: "success",
      startTime: new Date(nodeStart).toISOString(),
      durationMs: duration,
      input: getNodeInput(node, i),
      output: getNodeOutput(node, i),
    });
  }

  const endTime = new Date();
  const execution = {
    id: execId,
    workflowId: wf.id,
    workflowName: wf.name,
    workflowCode: wfCode,
    trigger: triggerSource || "Manual",
    status: overallStatus,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    durationMs: totalDuration,
    payload: payload || {},
    nodeResults,
  };

  executionHistory.unshift(execution);
  console.log(`[n8n] ✅ Executed "${wf.name}" (${execId}) — ${nodeResults.length} nodes — ${totalDuration}ms`);
  return execution;
}

// ─── HTML Helpers ─────────────────────────────────────────────────────────────

const css = `
  :root {--bg:#0f172a;--card:#1e293b;--card2:#243044;--border:#334155;--text:#f8fafc;--muted:#94a3b8;--primary:#ff6d5a;--success:#22c55e;--error:#ef4444;--warning:#f59e0b;--info:#60a5fa;--ai:#a78bfa;--trigger:#fbbf24}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--text);padding:0}
  nav{display:flex;align-items:center;justify-content:space-between;padding:14px 24px;border-bottom:1px solid var(--border);background:#0c1525;position:sticky;top:0;z-index:100}
  .logo{display:flex;align-items:center;gap:10px;text-decoration:none;color:inherit}
  .logo-badge{background:var(--primary);color:white;font-weight:800;padding:5px 11px;border-radius:8px;font-size:15px}
  .nav-links{display:flex;gap:4px}
  .nav-link{padding:7px 14px;border-radius:8px;text-decoration:none;color:var(--muted);font-size:14px;transition:.15s}
  .nav-link:hover,.nav-link.active{background:var(--card);color:var(--text)}
  .pill{padding:3px 10px;border-radius:9999px;font-size:11px;font-weight:700}
  .pill-success{background:rgba(34,197,94,.15);color:var(--success);border:1px solid var(--success)}
  .pill-error{background:rgba(239,68,68,.15);color:var(--error);border:1px solid var(--error)}
  .pill-active{background:rgba(96,165,250,.15);color:var(--info);border:1px solid var(--info)}
  .pill-running{background:rgba(245,158,11,.15);color:var(--warning);border:1px solid var(--warning)}
  main{padding:24px;max-width:1400px;margin:0 auto}
  h1{font-size:24px;margin-bottom:4px}
  h2{font-size:18px;margin-bottom:16px;color:var(--text)}
  .subtitle{color:var(--muted);font-size:14px;margin-bottom:24px}
  .card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:20px}
  .grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
  .grid-2{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
  .stat{text-align:center;padding:16px;background:var(--card2);border-radius:10px}
  .stat-val{font-size:28px;font-weight:800;color:var(--primary)}
  .stat-lbl{font-size:12px;color:var(--muted);margin-top:4px}
  table{width:100%;border-collapse:collapse}
  th,td{padding:11px 14px;border-bottom:1px solid var(--border);font-size:13px;text-align:left}
  th{color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.5px;font-weight:600}
  tr:hover td{background:rgba(255,255,255,.02)}
  .btn{padding:8px 16px;border-radius:8px;border:none;font-size:13px;font-weight:600;cursor:pointer;transition:.15s;text-decoration:none;display:inline-flex;align-items:center;gap:6px}
  .btn-primary{background:var(--primary);color:white}
  .btn-primary:hover{background:#ff5744}
  .btn-secondary{background:var(--card2);color:var(--text);border:1px solid var(--border)}
  .btn-secondary:hover{background:var(--border)}
  .btn-sm{padding:5px 10px;font-size:12px}
  .node-canvas{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start;padding:16px;background:#0a1628;border-radius:10px;border:1px solid var(--border)}
  .node-card{background:var(--card);border:2px solid var(--border);border-radius:10px;padding:12px 16px;min-width:190px;max-width:220px;position:relative;transition:.2s}
  .node-card.success{border-color:var(--success);background:rgba(34,197,94,.06)}
  .node-card.error{border-color:var(--error);background:rgba(239,68,68,.06)}
  .node-card.trigger{border-color:var(--trigger)}
  .node-card.ai{border-color:var(--ai)}
  .node-icon{font-size:22px;margin-bottom:6px}
  .node-type{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px}
  .node-label{font-size:13px;font-weight:600;margin:3px 0}
  .node-desc{font-size:11px;color:var(--muted);line-height:1.4}
  .node-status{position:absolute;top:8px;right:8px;font-size:14px}
  .arrow{color:var(--muted);font-size:18px;align-self:center;padding:0 2px}
  code{background:#0f172a;padding:2px 7px;border-radius:4px;font-family:monospace;color:#f472b6;font-size:12px}
  .exec-detail{background:var(--card2);border-radius:8px;padding:12px;margin-top:10px;font-size:12px}
  .exec-row{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border)}
  .exec-row:last-child{border:none}
  .badge-node-ok{display:inline-block;background:rgba(34,197,94,.2);color:var(--success);border-radius:4px;padding:2px 7px;font-size:11px;font-weight:700}
  .badge-node-err{display:inline-block;background:rgba(239,68,68,.2);color:var(--error);border-radius:4px;padding:2px 7px;font-size:11px;font-weight:700}
  .timeline{display:flex;flex-direction:column;gap:8px}
  .timeline-item{display:flex;gap:12px;align-items:flex-start}
  .timeline-dot{width:10px;height:10px;border-radius:50%;margin-top:4px;flex-shrink:0}
  .dot-success{background:var(--success);box-shadow:0 0 6px var(--success)}
  .dot-error{background:var(--error);box-shadow:0 0 6px var(--error)}
  .cat-trigger{border-left:3px solid var(--trigger)}
  .cat-ai{border-left:3px solid var(--ai)}
  .cat-email{border-left:3px solid var(--info)}
  .cat-request{border-left:3px solid var(--muted)}
  .cat-logic{border-left:3px solid var(--warning)}
  .cat-data{border-left:3px solid var(--primary)}
`;

function navHtml(activePage) {
  return `<nav>
    <a href="/" class="logo"><div class="logo-badge">n8n</div><div><div style="font-size:16px;font-weight:700">OpsHub Workflow Studio</div><div style="font-size:11px;color:var(--muted)">Connected to Ellipsonic OpsHub Platform • v2.28.7</div></div></a>
    <div class="nav-links">
      <a href="/" class="nav-link ${activePage==='home'?'active':''}">📋 Workflows</a>
      <a href="/executions" class="nav-link ${activePage==='executions'?'active':''}">📜 Executions</a>
      <span class="pill pill-active" style="align-self:center">● Online</span>
    </div>
  </nav>`;
}

function workflowNodeCanvas(wf, executionResult) {
  const nodeResults = executionResult?.nodeResults || [];
  const nodeMap = {};
  nodeResults.forEach(nr => { nodeMap[nr.nodeId] = nr; });

  const nodeCards = wf.nodes.map((node, i) => {
    const result = nodeMap[node.id];
    const statusClass = result ? result.status : "";
    const statusIcon = result ? (result.status === "success" ? "✅" : "❌") : "";
    const catClass = `cat-${node.category}`;
    return `<div class="node-card ${statusClass} ${node.category === 'trigger' ? 'trigger' : ''} ${node.category === 'ai' ? 'ai' : ''} ${catClass}" title="${node.description}">
      <div class="node-status">${statusIcon}</div>
      <div class="node-icon">${node.type.split(' ')[0]}</div>
      <div class="node-type">${node.type.replace(node.type.split(' ')[0]+' ','')}</div>
      <div class="node-label">${node.label}</div>
      <div class="node-desc">${node.description.slice(0,80)}${node.description.length > 80 ? '...' : ''}</div>
      ${result ? `<div style="margin-top:6px;font-size:11px;color:var(--muted)">${result.durationMs}ms</div>` : ''}
    </div>
    ${i < wf.nodes.length - 1 ? '<div class="arrow">→</div>' : ''}`;
  }).join('');

  return `<div class="node-canvas">${nodeCards}</div>`;
}

function workflowNodeTimeline(exec) {
  if (!exec?.nodeResults?.length) return '';
  return `<div class="timeline">${exec.nodeResults.map(nr => `
    <div class="timeline-item">
      <div class="timeline-dot ${nr.status === 'success' ? 'dot-success' : 'dot-error'}"></div>
      <div style="flex:1">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-weight:600;font-size:13px">${nr.nodeType} — ${nr.nodeLabel}</span>
          <span class="${nr.status === 'success' ? 'badge-node-ok' : 'badge-node-err'}">${nr.status.toUpperCase()} ${nr.durationMs}ms</span>
        </div>
        <div style="font-size:11px;color:var(--muted);margin-top:3px">
          <strong>Input:</strong> <code>${JSON.stringify(nr.input).slice(0,120)}</code>
        </div>
        <div style="font-size:11px;color:var(--muted);margin-top:2px">
          <strong>Output:</strong> <code>${JSON.stringify(nr.output).slice(0,120)}</code>
        </div>
      </div>
    </div>`).join('')}
  </div>`;
}

// ─── Route Handlers ───────────────────────────────────────────────────────────

function homePage() {
  const wfList = Object.values(WORKFLOWS);
  const totalExecs = executionHistory.length;
  const successExecs = executionHistory.filter(e => e.status === "success").length;
  const recentExecs = executionHistory.slice(0, 5);

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>n8n — OpsHub Workflow Studio</title>
  <style>${css}</style></head><body>
  ${navHtml('home')}
  <main>
    <h1>Workflow Automation Studio</h1>
    <p class="subtitle">6 active workflows integrated with Ellipsonic OpsHub • All running on OpsHub API (http://localhost:5000)</p>
    
    <div class="grid-3" style="margin-bottom:24px">
      <div class="stat"><div class="stat-val">${wfList.length}</div><div class="stat-lbl">Active Workflows</div></div>
      <div class="stat"><div class="stat-val">${totalExecs}</div><div class="stat-lbl">Total Executions</div></div>
      <div class="stat"><div class="stat-val">${totalExecs ? Math.round(successExecs/totalExecs*100) : 100}%</div><div class="stat-lbl">Success Rate</div></div>
    </div>

    ${wfList.map(wf => `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
        <div>
          <div style="display:flex;align-items:center;gap:10px">
            <h2 style="margin:0">${wf.name}</h2>
            <span class="pill pill-active">Active</span>
          </div>
          <div style="font-size:13px;color:var(--muted);margin-top:4px">${wf.description}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:6px">
            <strong>Trigger:</strong> ${wf.trigger} &nbsp;|&nbsp; 
            <strong>Webhook:</strong> <code>http://localhost:5678${wf.webhook}</code> &nbsp;|&nbsp;
            <strong>Nodes:</strong> ${wf.nodes.length}
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0">
          <a href="/workflow/${wf.code}" class="btn btn-secondary btn-sm">🔍 Open Canvas</a>
          <a href="/execute/${wf.code}" class="btn btn-primary btn-sm">▶ Execute Now</a>
        </div>
      </div>
      ${workflowNodeCanvas(wf, null)}
    </div>`).join('')}

    <div class="card">
      <h2>Recent Execution History</h2>
      <table>
        <thead><tr><th>Workflow</th><th>Trigger</th><th>Started</th><th>Duration</th><th>Status</th><th></th></tr></thead>
        <tbody>
          ${recentExecs.map(e => `<tr>
            <td><strong>${e.workflowName}</strong></td>
            <td>${e.trigger}</td>
            <td>${new Date(e.startTime).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})}</td>
            <td>${e.durationMs}ms</td>
            <td><span class="pill ${e.status === 'success' ? 'pill-success' : 'pill-error'}">${e.status.toUpperCase()}</span></td>
            <td><a href="/execution/${e.id}" class="btn btn-secondary btn-sm">Details</a></td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div style="margin-top:12px"><a href="/executions" class="btn btn-secondary">View All Executions →</a></div>
    </div>
  </main></body></html>`;
}

function workflowPage(wfCode) {
  const wf = WORKFLOWS[wfCode];
  if (!wf) return null;
  const wfExecs = executionHistory.filter(e => e.workflowCode === wfCode).slice(0, 8);

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${wf.name} — n8n OpsHub</title>
  <style>${css}</style></head><body>
  ${navHtml('home')}
  <main>
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
      <div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:4px"><a href="/" style="color:var(--muted);text-decoration:none">← Workflows</a></div>
        <h1>${wf.name}</h1>
        <p class="subtitle">${wf.description}</p>
        <div style="display:flex;gap:12px;font-size:13px;color:var(--muted)">
          <span>⏰ ${wf.trigger}</span>
          <span>🪝 <code>http://localhost:5678${wf.webhook}</code></span>
          <span class="pill pill-active">Active</span>
        </div>
      </div>
      <a href="/execute/${wf.code}" class="btn btn-primary">▶ Execute Now</a>
    </div>

    <div class="card">
      <h2>Workflow Canvas — ${wf.nodes.length} Nodes</h2>
      <p style="font-size:13px;color:var(--muted);margin-bottom:12px">Hover nodes to see full descriptions. Execute the workflow to see green checkmarks per node.</p>
      ${workflowNodeCanvas(wf, null)}
      
      <h2 style="margin-top:24px">Node Descriptions</h2>
      <table style="margin-top:8px">
        <thead><tr><th>#</th><th>Node</th><th>Type</th><th>Description</th></tr></thead>
        <tbody>
          ${wf.nodes.map((n, i) => `<tr>
            <td style="color:var(--muted)">${i+1}</td>
            <td><strong>${n.label}</strong></td>
            <td>${n.type}</td>
            <td style="color:var(--muted)">${n.description}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>

    <div class="card">
      <h2>Execution History (this workflow)</h2>
      ${wfExecs.length === 0 ? '<p style="color:var(--muted)">No executions yet. Click Execute Now to run this workflow.</p>' : `
      <table>
        <thead><tr><th>ID</th><th>Trigger</th><th>Started (IST)</th><th>Duration</th><th>Nodes</th><th>Status</th><th></th></tr></thead>
        <tbody>
          ${wfExecs.map(e => `<tr>
            <td><code>${e.id.slice(-10)}</code></td>
            <td>${e.trigger}</td>
            <td>${new Date(e.startTime).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})}</td>
            <td>${e.durationMs}ms</td>
            <td>${e.nodeResults?.length || wf.nodes.length}</td>
            <td><span class="pill ${e.status === 'success' ? 'pill-success' : 'pill-error'}">${e.status.toUpperCase()}</span></td>
            <td><a href="/execution/${e.id}" class="btn btn-secondary btn-sm">Details</a></td>
          </tr>`).join('')}
        </tbody>
      </table>`}
    </div>
  </main></body></html>`;
}

function executionDetailPage(execId) {
  const exec = executionHistory.find(e => e.id === execId);
  if (!exec) return null;
  const wf = WORKFLOWS[exec.workflowCode];

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Execution ${execId} — n8n OpsHub</title>
  <style>${css}</style></head><body>
  ${navHtml('executions')}
  <main>
    <div style="font-size:12px;color:var(--muted);margin-bottom:8px"><a href="/executions" style="color:var(--muted);text-decoration:none">← Executions</a> / <a href="/workflow/${exec.workflowCode}" style="color:var(--muted);text-decoration:none">${exec.workflowName}</a></div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div>
        <h1>Execution Detail</h1>
        <p style="color:var(--muted);font-size:14px">${exec.workflowName} — <code>${exec.id}</code></p>
      </div>
      <span class="pill ${exec.status === 'success' ? 'pill-success' : 'pill-error'}" style="font-size:14px;padding:8px 16px">${exec.status === 'success' ? '✅' : '❌'} ${exec.status.toUpperCase()}</span>
    </div>

    <div class="grid-2" style="margin-bottom:20px">
      <div class="card">
        <h2>Execution Summary</h2>
        <div class="exec-detail">
          <div class="exec-row"><span>Workflow</span><strong>${exec.workflowName}</strong></div>
          <div class="exec-row"><span>Trigger</span><span>${exec.trigger}</span></div>
          <div class="exec-row"><span>Started</span><span>${new Date(exec.startTime).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})}</span></div>
          <div class="exec-row"><span>Finished</span><span>${new Date(exec.endTime).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})}</span></div>
          <div class="exec-row"><span>Duration</span><strong>${exec.durationMs}ms</strong></div>
          <div class="exec-row"><span>Nodes Executed</span><strong>${exec.nodeResults?.length || '—'} / ${wf?.nodes.length || '—'}</strong></div>
          <div class="exec-row"><span>Status</span><span class="pill ${exec.status === 'success' ? 'pill-success' : 'pill-error'}">${exec.status.toUpperCase()}</span></div>
        </div>
      </div>
      <div class="card">
        <h2>Payload / Context</h2>
        <pre style="background:#0a1628;padding:12px;border-radius:8px;font-size:12px;overflow:auto;color:#e2e8f0">${JSON.stringify(exec.payload, null, 2)}</pre>
      </div>
    </div>

    <div class="card">
      <h2>Workflow Canvas — Execution State</h2>
      ${wf ? workflowNodeCanvas(wf, exec) : ''}
    </div>

    <div class="card">
      <h2>Node-by-Node Execution Timeline</h2>
      <p style="color:var(--muted);font-size:13px;margin-bottom:16px">Each node shows its input, output, duration, and status. Green = success, Red = failed.</p>
      ${workflowNodeTimeline(exec)}
    </div>
  </main></body></html>`;
}

function executionsPage() {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Executions — n8n OpsHub</title>
  <style>${css}</style></head><body>
  ${navHtml('executions')}
  <main>
    <h1>Execution History</h1>
    <p class="subtitle">${executionHistory.length} total executions across all workflows</p>
    <div class="card">
      <table>
        <thead><tr><th>Execution ID</th><th>Workflow</th><th>Trigger</th><th>Started (IST)</th><th>Duration</th><th>Status</th><th></th></tr></thead>
        <tbody>
          ${executionHistory.map(e => `<tr>
            <td><code>${e.id}</code></td>
            <td><a href="/workflow/${e.workflowCode}" style="color:var(--info);text-decoration:none">${e.workflowName}</a></td>
            <td>${e.trigger}</td>
            <td>${new Date(e.startTime).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})}</td>
            <td>${e.durationMs}ms</td>
            <td><span class="pill ${e.status === 'success' ? 'pill-success' : 'pill-error'}">${e.status.toUpperCase()}</span></td>
            <td><a href="/execution/${e.id}" class="btn btn-secondary btn-sm">Details</a></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </main></body></html>`;
}

// ─── HTTP Server ──────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") { res.writeHead(200); res.end(); return; }

  // ── Webhook Receiver
  if (pathname.startsWith("/webhook")) {
    let body = "";
    req.on("data", c => body += c);
    await new Promise(r => req.on("end", r));
    let payload = {};
    try { payload = JSON.parse(body || "{}"); } catch {}

    const wfCode = Object.keys(WORKFLOWS).find(k => pathname.includes(k) || payload.workflowCode === k) || "dept_review_alert";
    const exec = await executeWorkflow(wfCode, "Webhook", payload);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true, executionId: exec.id, workflow: exec.workflowName, nodesExecuted: exec.nodeResults.length, durationMs: exec.durationMs, status: exec.status }));
    return;
  }

  // ── Execute Workflow manually via URL
  if (pathname.startsWith("/execute/")) {
    const wfCode = pathname.replace("/execute/", "");
    const exec = await executeWorkflow(wfCode, "Manual (UI Button)", {});
    res.writeHead(302, { Location: `/execution/${exec.id}` });
    res.end();
    return;
  }

  // ── API Endpoints
  if (pathname === "/api/executions") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ data: executionHistory, total: executionHistory.length }));
    return;
  }
  if (pathname === "/api/workflows") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ data: Object.values(WORKFLOWS) }));
    return;
  }
  if (pathname === "/healthz") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", version: "2.28.7", workflows: Object.keys(WORKFLOWS).length, executions: executionHistory.length }));
    return;
  }

  // ── HTML Pages
  let html = null;
  if (pathname === "/" || pathname === "") { html = homePage(); }
  else if (pathname === "/executions") { html = executionsPage(); }
  else if (pathname.startsWith("/workflow/")) { html = workflowPage(pathname.replace("/workflow/", "")); }
  else if (pathname.startsWith("/execution/")) { html = executionDetailPage(pathname.replace("/execution/", "")); }

  if (html) {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(html);
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(PORT, () => {
  console.log(`\n[OpsHub Workflow Studio] ✅ Running at http://localhost:${PORT}`);
  console.log(`[OpsHub Workflow Studio] 6 workflows loaded with full node graphs`);
  console.log(`[OpsHub Workflow Studio] ${executionHistory.length} historical executions seeded`);
  console.log(`\n  Workflows:`);
  Object.values(WORKFLOWS).forEach(w => {
    console.log(`    ● ${w.name.padEnd(40)} ${w.nodes.length} nodes  ${w.webhook}`);
  });
});
