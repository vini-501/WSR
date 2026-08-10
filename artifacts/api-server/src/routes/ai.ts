import { Router, type IRouter } from "express";
import { eq, and, desc, isNull } from "drizzle-orm";
import { db, aiSettingsTable, aiSummariesTable, type AISummaryData } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/rbac";
import { logActivity, logAudit } from "../lib/activityLogger";
import {
  getAiSettings,
  generateExecutiveAISummary,
  generateDepartmentAISummary,
  generateEmployeeAIInsights,
} from "../lib/aiEngine";

const router: IRouter = Router();

// Helper to calculate current or default Monday ISO week start
function getWeekStartString(weekParam?: string): string {
  if (weekParam && weekParam !== "current" && weekParam !== "all_weeks") {
    return weekParam;
  }
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split("T")[0];
}

// GET /api/ai/settings - Retrieve AI Configuration
router.get(
  "/ai/settings",
  requireAuth,
  requireRole("admin", "management"),
  async (req, res): Promise<void> => {
    try {
      const settings = await getAiSettings();
      res.json({
        ...settings,
        api_key: settings.api_key ? "••••••••••••••••" : "",
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch AI settings" });
    }
  }
);

// PUT /api/ai/settings - Update AI Settings
router.put(
  "/ai/settings",
  requireAuth,
  requireRole("admin"),
  async (req, res): Promise<void> => {
    try {
      const existing = await getAiSettings();
      const updates: Record<string, unknown> = {
        updated_at: new Date(),
      };

      const fields = [
        "enabled",
        "provider",
        "model",
        "summary_length",
        "tone",
        "auto_schedule",
      ];
      for (const f of fields) {
        if (req.body[f] !== undefined) {
          updates[f] = req.body[f];
        }
      }

      if (req.body.api_key && req.body.api_key !== "••••••••••••••••") {
        updates.api_key = req.body.api_key;
      }

      const [updated] = await db
        .update(aiSettingsTable)
        .set(updates)
        .where(eq(aiSettingsTable.id, existing.id))
        .returning();

      await logAudit({
        user: req.user!,
        tableName: "ai_settings",
        operation: "UPDATE",
        recordId: existing.id,
        newValues: { ...updated, api_key: "[redacted]" },
      });

      res.json({
        ...updated,
        api_key: updated.api_key ? "••••••••••••••••" : "",
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to update AI settings" });
    }
  }
);

// GET /api/ai/summary/executive - Fetch or generate Executive Summary
router.get(
  "/ai/summary/executive",
  requireAuth,
  requireRole("admin", "management"),
  async (req, res): Promise<void> => {
    try {
      const weekStart = getWeekStartString(req.query.week_start as string);
      const force = req.query.force === "true";

      const summary = await generateExecutiveAISummary(weekStart, {
        forceRegenerate: force,
        userId: req.user!.id,
      });

      res.json(summary);
    } catch (err) {
      console.error("Error generating executive AI summary:", err);
      res.status(500).json({ error: "Failed to generate executive summary" });
    }
  }
);

// POST /api/ai/summary/executive/regenerate - Force regenerate Executive Summary
router.post(
  "/ai/summary/executive/regenerate",
  requireAuth,
  requireRole("admin", "management"),
  async (req, res): Promise<void> => {
    try {
      const weekStart = getWeekStartString(req.body.week_start || (req.query.week_start as string));

      const summary = await generateExecutiveAISummary(weekStart, {
        forceRegenerate: true,
        userId: req.user!.id,
      });

      await logActivity({
        user: req.user!,
        action: "regenerate_ai_summary",
        entityType: "ai_summary",
        description: `${req.user!.name} regenerated AI Executive Summary for week ${weekStart}`,
      });

      res.json(summary);
    } catch (err) {
      res.status(500).json({ error: "Failed to regenerate executive summary" });
    }
  }
);

// PUT /api/ai/summary/executive - Save manual edits to Executive Summary
router.put(
  "/ai/summary/executive",
  requireAuth,
  requireRole("admin", "management"),
  async (req, res): Promise<void> => {
    try {
      const weekStart = getWeekStartString(req.body.week_start);
      const { summary_data } = req.body;

      if (!summary_data) {
        res.status(400).json({ error: "summary_data is required" });
        return;
      }

      const [latest] = await db
        .select()
        .from(aiSummariesTable)
        .where(
          and(
            eq(aiSummariesTable.type, "executive"),
            eq(aiSummariesTable.target_id, weekStart)
          )
        )
        .orderBy(desc(aiSummariesTable.version))
        .limit(1);

      const newVersion = latest ? latest.version + 1 : 1;

      const [saved] = await db
        .insert(aiSummariesTable)
        .values({
          type: "executive",
          target_id: weekStart,
          reporting_week: weekStart,
          summary_data: summary_data as AISummaryData,
          ai_provider_used: "manual_edit",
          ai_model_used: "user_edited",
          version: newVersion,
          generated_by: req.user!.id,
        })
        .returning();

      res.json({
        data: saved.summary_data,
        metadata: {
          version: saved.version,
          provider: saved.ai_provider_used,
          model: saved.ai_model_used,
          generated_at: saved.created_at.toISOString(),
        },
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to update executive summary" });
    }
  }
);

// GET /api/ai/summary/department/:departmentId - Fetch Department AI Summary
router.get(
  "/ai/summary/department/:departmentId",
  requireAuth,
  requireRole("admin", "management", "department_head"),
  async (req, res): Promise<void> => {
    try {
      const departmentId = Array.isArray(req.params.departmentId)
        ? req.params.departmentId[0]
        : req.params.departmentId;
      const weekStart = getWeekStartString(req.query.week_start as string);

      const summary = await generateDepartmentAISummary(departmentId, weekStart);
      res.json(summary);
    } catch (err) {
      res.status(500).json({ error: "Failed to generate department summary" });
    }
  }
);

// GET /api/ai/summary/employee/:employeeId - Fetch Employee AI Insights
router.get(
  "/ai/summary/employee/:employeeId",
  requireAuth,
  async (req, res): Promise<void> => {
    try {
      const employeeId = Array.isArray(req.params.employeeId)
        ? req.params.employeeId[0]
        : req.params.employeeId;
      const weekStart = getWeekStartString(req.query.week_start as string);

      // Employees can only view their own insights unless admin/management/dept head
      if (req.user!.role === "employee" && req.user!.id !== employeeId) {
        res.status(403).json({ error: "Access denied" });
        return;
      }

      const summary = await generateEmployeeAIInsights(employeeId, weekStart);
      res.json(summary);
    } catch (err) {
      res.status(500).json({ error: "Failed to generate employee insights" });
    }
  }
);

// GET /api/ai/bi-insights - Fetch Business Intelligence summary
router.get(
  "/ai/bi-insights",
  requireAuth,
  requireRole("admin", "management"),
  async (req, res): Promise<void> => {
    try {
      const weekStart = getWeekStartString(req.query.week_start as string);
      const summary = await generateExecutiveAISummary(weekStart);
      res.json(summary.data.business_intelligence);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch BI insights" });
    }
  }
);

// POST /api/ai/summary/export-pdf - Export summary as formatted document payload
router.post(
  "/api/ai/summary/export-pdf",
  requireAuth,
  requireRole("admin", "management"),
  async (req, res): Promise<void> => {
    try {
      const weekStart = getWeekStartString(req.body.week_start);
      const summary = await generateExecutiveAISummary(weekStart);

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Executive Summary - Week of ${weekStart}</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 40px; color: #1e293b; line-height: 1.6; }
            h1 { color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
            .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-weight: bold; font-size: 12px; }
            .badge-healthy { background: #dcfce7; color: #15803d; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
            ul { padding-left: 20px; }
            li { margin-bottom: 8px; }
          </style>
        </head>
        <body>
          <h1>Executive WCR Summary - Week of ${weekStart}</h1>
          <div class="card">
            <p><strong>Health Indicator:</strong> <span class="badge badge-healthy">${summary.data.company_health_score}</span></p>
            <p><strong>Submission Coverage:</strong> ${summary.data.submission_rate_pct}% (${summary.data.total_submitted} Reports)</p>
            <p><strong>Productivity Score:</strong> ${summary.data.productivity_score}%</p>
          </div>

          <h2>Executive Brief</h2>
          <div class="card">${summary.data.executive_summary_text}</div>

          <h2>Major Achievements</h2>
          <ul>${summary.data.major_achievements.map(a => `<li>${a}</li>`).join("")}</ul>

          <h2>Key Blockers & Risks</h2>
          <ul>${summary.data.key_blockers_and_risks.map(r => `<li>${r}</li>`).join("")}</ul>

          <h2>High-Priority Action Items</h2>
          <ul>${summary.data.high_priority_action_items.map(a => `<li>${a}</li>`).join("")}</ul>
        </body>
        </html>
      `;

      res.json({
        filename: `Executive_AI_Summary_${weekStart}.html`,
        html: htmlContent,
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to export PDF" });
    }
  }
);

export default router;
