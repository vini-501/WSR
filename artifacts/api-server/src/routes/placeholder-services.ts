/**
 * Placeholder service interfaces for future integrations.
 * These services are intentionally not implemented — they are stubs
 * for future AI automation and external integrations.
 */

// ─── AI Service ───────────────────────────────────────────────────────────────
export interface AiService {
  /** TODO: Implement AI-powered weekly report summarization */
  summarizeReports(reportIds: string[]): Promise<string>;
  /** TODO: Generate department performance insights */
  generateInsights(departmentId: string): Promise<string>;
  /** TODO: Detect anomalies in submission patterns */
  detectAnomalies(): Promise<{ employeeId: string; reason: string }[]>;
}

// ─── n8n Workflow Service ─────────────────────────────────────────────────────
export interface N8nService {
  /** TODO: Trigger n8n workflow for report submission reminder */
  triggerReminderWorkflow(departmentId: string): Promise<void>;
  /** TODO: Trigger n8n workflow for report approval notification */
  triggerApprovalWorkflow(reportId: string, approved: boolean): Promise<void>;
  /** TODO: Sync data to external systems via n8n */
  syncToExternalSystems(payload: unknown): Promise<void>;
}

// ─── GitHub Service ───────────────────────────────────────────────────────────
export interface GitHubService {
  /** TODO: Create GitHub issues from blockers in reports */
  createIssueFromBlocker(blocker: string, employeeId: string): Promise<string>;
  /** TODO: Fetch commit stats for a user */
  getCommitStats(githubUsername: string): Promise<{ commits: number; prs: number }>;
}

// ─── Google Sheets Service ────────────────────────────────────────────────────
export interface GoogleSheetsService {
  /** TODO: Export weekly reports to Google Sheets */
  exportReports(weekStart: string): Promise<string>;
  /** TODO: Import employee data from Google Sheets */
  importEmployees(spreadsheetId: string): Promise<void>;
}

// ─── Website Service ──────────────────────────────────────────────────────────
export interface WebsiteService {
  /** TODO: Publish department performance to company website/intranet */
  publishPerformanceReport(departmentId: string): Promise<void>;
}

// ─── CRM Service ──────────────────────────────────────────────────────────────
export interface CrmService {
  /** TODO: Sync employee data with CRM */
  syncEmployee(employeeId: string): Promise<void>;
  /** TODO: Fetch customer interactions for account managers */
  getCustomerInteractions(employeeId: string): Promise<unknown[]>;
}

// ─── Meta Service ─────────────────────────────────────────────────────────────
export interface MetaService {
  /** TODO: Post team achievements to company Meta/Workplace feed */
  postAchievement(message: string): Promise<void>;
}

// ─── Internyx Service ─────────────────────────────────────────────────────────
export interface InternyxService {
  /** TODO: Sync intern performance data with Internyx platform */
  syncInternData(employeeId: string): Promise<void>;
  /** TODO: Fetch intern evaluation data */
  getEvaluationData(internId: string): Promise<unknown>;
}
