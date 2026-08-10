import { Router, type IRouter } from "express";
import { eq, and, desc, isNull, ilike, count, sql } from "drizzle-orm";
import {
  db,
  workflowsTable,
  workflowLogsTable,
  escalationsTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/rbac";
import { logActivity, logAudit } from "../lib/activityLogger";
import {
  seedDefaultWorkflows,
  executeWorkflow,
  retryFailedWorkflow,
} from "../lib/workflowEngine";

const router: IRouter = Router();

// GET /api/workflows - List all workflows
router.get(
  "/workflows",
  requireAuth,
  requireRole("admin", "management"),
  async (req, res): Promise<void> => {
    try {
      await seedDefaultWorkflows();
      const workflows = await db
        .select()
        .from(workflowsTable)
        .orderBy(workflowsTable.name);
      res.json(workflows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch workflows" });
    }
  }
);

// PUT /api/workflows/:id - Update workflow configuration / n8n webhook
router.put(
  "/workflows/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      const [existing] = await db
        .select()
        .from(workflowsTable)
        .where(eq(workflowsTable.id, id))
        .limit(1);

      if (!existing) {
        res.status(404).json({ error: "Workflow not found" });
        return;
      }

      const updates: Record<string, unknown> = {
        updated_at: new Date(),
      };

      const fields = [
        "enabled",
        "schedule_cron",
        "n8n_webhook_url",
        "n8n_workflow_id",
        "config",
      ];
      for (const f of fields) {
        if (req.body[f] !== undefined) {
          updates[f] = req.body[f];
        }
      }

      const [updated] = await db
        .update(workflowsTable)
        .set(updates)
        .where(eq(workflowsTable.id, id))
        .returning();

      await logAudit({
        user: req.user!,
        tableName: "workflows",
        operation: "UPDATE",
        recordId: id,
        oldValues: existing,
        newValues: updated,
      });

      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: "Failed to update workflow" });
    }
  }
);

// POST /api/workflows/:id/run - Manual trigger workflow execution
router.post(
  "/workflows/:id/run",
  requireAuth,
  requireRole("admin"),
  async (req, res): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      const [wf] = await db
        .select()
        .from(workflowsTable)
        .where(eq(workflowsTable.id, id))
        .limit(1);

      if (!wf) {
        res.status(404).json({ error: "Workflow not found" });
        return;
      }

      const result = await executeWorkflow(wf.code, "manual_admin", req.body.payload);

      await logActivity({
        user: req.user!,
        action: "run_workflow",
        entityType: "workflow",
        entityId: wf.id,
        description: `${req.user!.name} manually triggered workflow "${wf.name}"`,
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to trigger workflow" });
    }
  }
);

// GET /api/workflows/logs - Paginated workflow execution logs
router.get(
  "/workflows/logs",
  requireAuth,
  requireRole("admin", "management"),
  async (req, res): Promise<void> => {
    try {
      const page = parseInt((req.query.page as string) || "1");
      const limit = parseInt((req.query.limit as string) || "20");
      const search = req.query.search as string;
      const status = req.query.status as string;

      const offset = (page - 1) * limit;
      const conditions: any[] = [];

      if (search) {
        conditions.push(ilike(workflowLogsTable.workflow_name, `%${search}%`));
      }
      if (status && status !== "all") {
        conditions.push(eq(workflowLogsTable.status, status));
      }

      const whereClause = conditions.length ? and(...conditions) : undefined;

      const [{ countVal }] = await db
        .select({ countVal: count() })
        .from(workflowLogsTable)
        .where(whereClause);

      const logs = await db
        .select()
        .from(workflowLogsTable)
        .where(whereClause)
        .orderBy(desc(workflowLogsTable.created_at))
        .limit(limit)
        .offset(offset);

      res.json({
        data: logs,
        total: Number(countVal),
        page,
        total_pages: Math.ceil(Number(countVal) / limit),
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch workflow logs" });
    }
  }
);

// POST /api/workflows/logs/:id/retry - Retry failed workflow execution
router.post(
  "/workflows/logs/:id/retry",
  requireAuth,
  requireRole("admin"),
  async (req, res): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await retryFailedWorkflow(id);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to retry workflow" });
    }
  }
);

// GET /api/workflows/stats - Workflow Automation Dashboard Metrics
router.get(
  "/workflows/stats",
  requireAuth,
  requireRole("admin", "management"),
  async (req, res): Promise<void> => {
    try {
      await seedDefaultWorkflows();

      const [{ activeCount }] = await db
        .select({ activeCount: count() })
        .from(workflowsTable)
        .where(eq(workflowsTable.enabled, true));

      const [{ totalRuns }] = await db
        .select({ totalRuns: count() })
        .from(workflowLogsTable);

      const [{ successCount }] = await db
        .select({ successCount: count() })
        .from(workflowLogsTable)
        .where(eq(workflowLogsTable.status, "success"));

      const [{ failedCount }] = await db
        .select({ failedCount: count() })
        .from(workflowLogsTable)
        .where(eq(workflowLogsTable.status, "failed"));

      const [recentLog] = await db
        .select()
        .from(workflowLogsTable)
        .orderBy(desc(workflowLogsTable.created_at))
        .limit(1);

      const total = Number(totalRuns);
      const success = Number(successCount);
      const successRate = total > 0 ? Math.round((success / total) * 100) : 100;

      const recentActivity = await db
        .select()
        .from(workflowLogsTable)
        .orderBy(desc(workflowLogsTable.created_at))
        .limit(5);

      res.json({
        active_workflows: Number(activeCount),
        total_runs: total,
        success_rate: successRate,
        failed_count: Number(failedCount),
        last_run: recentLog ? recentLog.created_at : null,
        recent_activity: recentActivity,
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch workflow stats" });
    }
  }
);

// GET /api/workflows/escalations - Escalation History Ledger
router.get(
  "/workflows/escalations",
  requireAuth,
  requireRole("admin", "management", "department_head"),
  async (req, res): Promise<void> => {
    try {
      const escalations = await db
        .select()
        .from(escalationsTable)
        .orderBy(desc(escalationsTable.created_at))
        .limit(50);

      res.json(escalations);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch escalations" });
    }
  }
);

export default router;
