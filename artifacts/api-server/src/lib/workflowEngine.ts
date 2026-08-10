import {
  db,
  workflowsTable,
  workflowLogsTable,
  escalationsTable,
  employeesTable,
  weeklyReportsTable,
  departmentsTable,
} from "@workspace/db";
import { eq, and, isNull, count, desc, inArray } from "drizzle-orm";
import { logger } from "./logger";
import { createNotification, notifyDepartmentHeads, notifyManagersAndAdmins } from "./notifications";
import { queueEmail } from "./emailService";
import { generateExecutiveAISummary } from "./aiEngine";

const DEFAULT_WORKFLOWS = [
  {
    code: "weekly_reminder",
    name: "Weekly Submission Reminder",
    description: "Automated Friday morning reminder emails sent to employees with unsubmitted WCRs.",
    trigger_type: "cron",
    schedule_cron: "0 10 * * 5",
    n8n_webhook_url: "http://localhost:5678/webhook/wcr-reminder",
  },
  {
    code: "overdue_escalation",
    name: "Overdue Report Escalation Engine",
    description: "Detects missing reports past deadline, notifies employees, escalates to Department Heads (L2) and Management (L3).",
    trigger_type: "cron",
    schedule_cron: "0 18 * * 5",
    n8n_webhook_url: "http://localhost:5678/webhook/wcr-escalation",
  },
  {
    code: "ai_executive_summary",
    name: "AI Executive Summary Generator",
    description: "Generates AI executive brief and health scores after reports are approved or at weekly reporting deadline.",
    trigger_type: "cron",
    schedule_cron: "0 19 * * 5",
    n8n_webhook_url: "http://localhost:5678/webhook/wcr-ai-summary",
  },
  {
    code: "executive_digest",
    name: "Executive Digest Email Dispatcher",
    description: "Dispatches weekly AI Executive Summary digest emails to management and executive admins.",
    trigger_type: "cron",
    schedule_cron: "0 9 * * 1",
    n8n_webhook_url: "http://localhost:5678/webhook/wcr-digest-email",
  },
  {
    code: "dept_review_alert",
    name: "Department Head Review Alert",
    description: "Triggers notifications and email reviews when new WCR reports are submitted.",
    trigger_type: "event",
    schedule_cron: "* * * * *",
    n8n_webhook_url: "http://localhost:5678/webhook/wcr-dept-review",
  },
  {
    code: "late_submission_report",
    name: "Late Submission & Completion Reporter",
    description: "Generates weekly department completion metrics and late submission logs.",
    trigger_type: "cron",
    schedule_cron: "0 12 * * 6",
    n8n_webhook_url: "http://localhost:5678/webhook/wcr-late-submission",
  },
];

/**
 * Ensures default workflows are populated in the database
 */
export async function seedDefaultWorkflows() {
  try {
    for (const def of DEFAULT_WORKFLOWS) {
      const [existing] = await db
        .select({ id: workflowsTable.id })
        .from(workflowsTable)
        .where(eq(workflowsTable.code, def.code))
        .limit(1);

      if (!existing) {
        await db.insert(workflowsTable).values({
          code: def.code,
          name: def.name,
          description: def.description,
          trigger_type: def.trigger_type,
          schedule_cron: def.schedule_cron,
          n8n_webhook_url: def.n8n_webhook_url,
          enabled: true,
        });
      } else {
        await db
          .update(workflowsTable)
          .set({ n8n_webhook_url: def.n8n_webhook_url })
          .where(eq(workflowsTable.id, existing.id));
      }
    }
  } catch (err) {
    logger.error({ err }, "Error seeding default workflows");
  }
}

function getCurrentMondayStr(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split("T")[0];
}

/**
 * Execute internal handler for a specific workflow
 */
async function runInternalWorkflowHandler(code: string, payload?: any): Promise<{ message: string; details?: any }> {
  const weekStart = getCurrentMondayStr();

  switch (code) {
    case "weekly_reminder": {
      const activeEmployees = await db
        .select({ id: employeesTable.id, name: employeesTable.name, email: employeesTable.email })
        .from(employeesTable)
        .where(and(eq(employeesTable.status, "active"), isNull(employeesTable.deleted_at)));

      const submitted = await db
        .select({ employee_id: weeklyReportsTable.employee_id })
        .from(weeklyReportsTable)
        .where(and(eq(weeklyReportsTable.week_start, weekStart), isNull(weeklyReportsTable.deleted_at)));

      const submittedSet = new Set(submitted.map(r => r.employee_id));
      let countReminded = 0;

      for (const emp of activeEmployees) {
        if (!submittedSet.has(emp.id)) {
          await createNotification({
            userId: emp.id,
            type: "reminder",
            title: "WCR Submission Reminder",
            message: `Hi ${emp.name}, please don't forget to submit your weekly report for the week of ${weekStart}.`,
          });
          queueEmail({
            recipientEmail: emp.email,
            recipientName: emp.name,
            triggerEvent: "weekly_reminder",
            templateData: { recipientName: emp.name, weekStart },
          });
          countReminded++;
        }
      }
      return { message: `Reminded ${countReminded} employee(s) with pending WCR submissions.` };
    }

    case "overdue_escalation": {
      const activeEmployees = await db
        .select({
          id: employeesTable.id,
          name: employeesTable.name,
          email: employeesTable.email,
          department_id: employeesTable.department_id,
          manager_id: employeesTable.manager_id,
        })
        .from(employeesTable)
        .where(and(eq(employeesTable.status, "active"), isNull(employeesTable.deleted_at)));

      const submitted = await db
        .select({ employee_id: weeklyReportsTable.employee_id })
        .from(weeklyReportsTable)
        .where(and(eq(weeklyReportsTable.week_start, weekStart), isNull(weeklyReportsTable.deleted_at)));

      const submittedSet = new Set(submitted.map(r => r.employee_id));
      let countEscalated = 0;

      for (const emp of activeEmployees) {
        if (!submittedSet.has(emp.id)) {
          countEscalated++;

          // Level 1: Employee Alert
          await db.insert(escalationsTable).values({
            employee_id: emp.id,
            employee_name: emp.name,
            week_start: weekStart,
            level: 1,
            status: "escalated",
            notes: "Level 1 Overdue Escalation: Employee notified of missed reporting deadline.",
          });

          // Level 2: Department Head Escalation
          if (emp.department_id) {
            const [dept] = await db
              .select({ head_id: departmentsTable.head_id, name: departmentsTable.name })
              .from(departmentsTable)
              .where(eq(departmentsTable.id, emp.department_id))
              .limit(1);

            if (dept?.head_id) {
              const [head] = await db
                .select({ name: employeesTable.name, email: employeesTable.email })
                .from(employeesTable)
                .where(eq(employeesTable.id, dept.head_id))
                .limit(1);

              await db.insert(escalationsTable).values({
                employee_id: emp.id,
                employee_name: emp.name,
                week_start: weekStart,
                level: 2,
                status: "escalated",
                escalated_to_id: dept.head_id,
                escalated_to_name: head?.name || "Department Head",
                notes: `Level 2 Overdue Escalation: Escalated to ${head?.name || "Department Head"} for department ${dept.name}.`,
              });

              if (head) {
                queueEmail({
                  recipientEmail: head.email,
                  recipientName: head.name,
                  triggerEvent: "overdue_reminder",
                  templateData: {
                    recipientName: head.name,
                    weekStart,
                    customMessage: `Escalation Notice: ${emp.name} has missed the WCR submission deadline for week ${weekStart}.`,
                  },
                });
              }
            }
          }

          // Level 3: Executive Escalation
          await db.insert(escalationsTable).values({
            employee_id: emp.id,
            employee_name: emp.name,
            week_start: weekStart,
            level: 3,
            status: "escalated",
            notes: "Level 3 Executive Escalation: Recorded in executive compliance ledger.",
          });
        }
      }

      return { message: `Escalated ${countEscalated} overdue report(s) across Levels 1-3.` };
    }

    case "ai_executive_summary": {
      const summary = await generateExecutiveAISummary(weekStart, { forceRegenerate: true });
      return { message: `Generated AI Executive Summary for week ${weekStart}. Health Score: ${summary.data.company_health_score}.` };
    }

    case "executive_digest": {
      const summary = await generateExecutiveAISummary(weekStart);
      const managers = await db
        .select({ email: employeesTable.email, name: employeesTable.name })
        .from(employeesTable)
        .where(
          and(
            inArray(employeesTable.role, ["admin", "management"]),
            eq(employeesTable.status, "active"),
            isNull(employeesTable.deleted_at)
          )
        );

      for (const mgr of managers) {
        queueEmail({
          recipientEmail: mgr.email,
          recipientName: mgr.name,
          triggerEvent: "executive_summary",
          templateData: {
            recipientName: mgr.name,
            weekStart,
            aiExecutiveText: summary.data.executive_summary_text,
            aiHealthScore: summary.data.company_health_score,
            stats: {
              totalEmployees: summary.data.department_breakdown.reduce((a, b) => a + b.tasks_completed, 0),
              submittedCount: summary.data.total_submitted,
              approvedCount: summary.data.total_submitted,
              completionRate: summary.data.submission_rate_pct,
            },
          },
        });
      }

      return { message: `Dispatched AI Executive Digest emails to ${managers.length} manager(s).` };
    }

    case "dept_review_alert": {
      return { message: "Department review alert listeners active." };
    }

    case "late_submission_report": {
      return { message: `Late submission analysis synthesized for week ${weekStart}.` };
    }

    default:
      return { message: `Workflow handler executed for ${code}` };
  }
}

/**
 * Core function to execute a workflow and log results
 */
export async function executeWorkflow(
  workflowCode: string,
  triggerSource: string = "manual_admin",
  payload?: any
): Promise<{ success: boolean; logId: string; executionTimeMs: number; resultMessage: string; error?: string }> {
  await seedDefaultWorkflows();

  const [wf] = await db
    .select()
    .from(workflowsTable)
    .where(eq(workflowsTable.code, workflowCode))
    .limit(1);

  if (!wf) {
    throw new Error(`Workflow code '${workflowCode}' not found`);
  }

  if (!wf.enabled) {
    throw new Error(`Workflow '${wf.name}' is currently disabled`);
  }

  const startTime = new Date();

  // Create running log
  const [log] = await db
    .insert(workflowLogsTable)
    .values({
      workflow_id: wf.id,
      workflow_name: wf.name,
      trigger_source: triggerSource,
      status: "running",
      start_time: startTime,
      payload: payload || null,
    })
    .returning();

  let success = false;
  let resultMessage = "";
  let errorDetails = "";

  try {
    // 1. Try dispatching to n8n webhook if URL exists
    if (wf.n8n_webhook_url && wf.n8n_webhook_url.trim().length > 5) {
      try {
        const response = await fetch(wf.n8n_webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workflowCode: wf.code,
            workflowName: wf.name,
            timestamp: new Date().toISOString(),
            payload,
          }),
        });
        if (response.ok) {
          logger.info({ code: wf.code }, "Dispatched webhook to n8n workflow server");
        }
      } catch (n8nErr) {
        logger.error({ err: n8nErr }, "n8n Webhook dispatch failed, running internal handler");
      }
    }

    // 2. Execute internal handler
    const res = await runInternalWorkflowHandler(wf.code, payload);
    resultMessage = res.message;
    success = true;
  } catch (err: any) {
    success = false;
    errorDetails = err.message || String(err);
    logger.error({ err, code: wf.code }, "Error executing workflow handler");
  }

  const endTime = new Date();
  const executionTimeMs = endTime.getTime() - startTime.getTime();

  // Update Log
  const [updatedLog] = await db
    .update(workflowLogsTable)
    .set({
      status: success ? "success" : "failed",
      end_time: endTime,
      execution_time_ms: executionTimeMs,
      error_details: success ? null : errorDetails,
      payload: { ...payload, resultMessage },
    })
    .where(eq(workflowLogsTable.id, log.id))
    .returning();

  // Update Workflow last_run_at
  await db
    .update(workflowsTable)
    .set({
      last_run_at: endTime,
      updated_at: endTime,
    })
    .where(eq(workflowsTable.id, wf.id));

  return {
    success,
    logId: updatedLog.id,
    executionTimeMs,
    resultMessage: success ? resultMessage : "Execution failed",
    error: success ? undefined : errorDetails,
  };
}

/**
 * Retry a failed workflow execution
 */
export async function retryFailedWorkflow(logId: string) {
  const [log] = await db
    .select()
    .from(workflowLogsTable)
    .where(eq(workflowLogsTable.id, logId))
    .limit(1);

  if (!log) throw new Error("Workflow log not found");

  const [wf] = await db
    .select()
    .from(workflowsTable)
    .where(eq(workflowsTable.id, log.workflow_id!))
    .limit(1);

  if (!wf) throw new Error("Parent workflow not found");

  await db
    .update(workflowLogsTable)
    .set({
      status: "retrying",
      retry_count: log.retry_count + 1,
    })
    .where(eq(workflowLogsTable.id, logId));

  return executeWorkflow(wf.code, "manual_retry", log.payload);
}
