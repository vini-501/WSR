import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export interface AISummaryData {
  overall_company_progress: number;
  total_submitted: number;
  submission_rate_pct: number;
  approval_rate_pct: number;
  company_health_score: "Critical" | "Warning" | "Healthy" | "Excellent";
  productivity_score: number;
  executive_summary_text: string;
  major_achievements: string[];
  key_blockers_and_risks: string[];
  high_priority_action_items: string[];
  department_breakdown: Array<{
    department_id: string;
    department_name: string;
    completion_rate: number;
    tasks_completed: number;
    risks_count: number;
    status: "On Track" | "Needs Attention" | "Critical";
    summary: string;
  }>;
  ai_recommendations: Array<{
    category: "support" | "process" | "risk" | "priority";
    title: string;
    description: string;
    impact: "High" | "Medium" | "Low";
  }>;
  business_intelligence: {
    frequently_reported_blockers: string[];
    recurring_risks: string[];
    departments_requiring_attention: string[];
    delayed_projects: string[];
    resource_shortages: string[];
    productivity_trend: "improving" | "stable" | "declining";
  };
}

export const aiSummariesTable = pgTable(
  "ai_summaries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: text("type").notNull(), // 'executive' | 'department' | 'employee'
    target_id: text("target_id").notNull(), // week_start string, department_id, or employee_id
    reporting_week: text("reporting_week").notNull(), // YYYY-MM-DD
    summary_data: jsonb("summary_data").$type<AISummaryData>().notNull(),
    ai_provider_used: text("ai_provider_used").notNull().default("system_engine"),
    ai_model_used: text("ai_model_used").notNull().default("heuristic_v1"),
    version: integer("version").notNull().default(1),
    generated_by: uuid("generated_by"),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_ai_summaries_type_target").on(table.type, table.target_id),
    index("idx_ai_summaries_reporting_week").on(table.reporting_week),
    index("idx_ai_summaries_created_at").on(table.created_at),
  ]
);

export const insertAiSummarySchema = createInsertSchema(aiSummariesTable).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertAiSummary = z.infer<typeof insertAiSummarySchema>;
export type AiSummary = typeof aiSummariesTable.$inferSelect;
