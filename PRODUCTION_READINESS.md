# Phase 10 – Production Readiness Guide & Operational Manual

## 1. Executive Overview
This document outlines the **Production Readiness Framework** for the Weekly Company Reporting (WCR) application (`Ellipsonic OpsHub`). It details security controls (RLS, RBAC), n8n workflow integration setup, backup & recovery procedures, error monitoring, UAT checklist, and sample onboarding data.

---

## 2. Security Audit & Access Control (RLS & RBAC)

### Role-Based Access Matrix
| Role | Reports Access | Employee Mgmt | Department Mgmt | Email & AI Config | Workflows & n8n | Audit Logs |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Admin** | Full | Full | Full | Full | Full (Read/Write/Run) | Full |
| **Management** | View All | View All | View All | View Insights | View Dashboard & Logs | View |
| **Department Head** | Dept Scope | Dept Scope | Dept Scope | Dept AI Scope | None | None |
| **Employee** | Own Scope | Own Scope | View | Own AI Scope | None | None |

### Supabase Row-Level Security (RLS) Rules
```sql
-- Enable RLS on core tables
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Employee policy: users can only select/update their own reports unless privileged role
CREATE POLICY employee_reports_policy ON weekly_reports
  FOR ALL
  USING (
    employee_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM employees 
      WHERE employees.auth_user_id = auth.uid() 
      AND role IN ('admin', 'management', 'department_head')
    )
  );
```

---

## 3. n8n Workflow Integration Guide

### Self-Hosted n8n Connection Setup
1. In the **OpsHub Admin Panel**, navigate to **Automations** (`/automations`).
2. Click **Configure** on any workflow (e.g. `Weekly Submission Reminder` or `Overdue Report Escalation Engine`).
3. Enter your n8n instance Webhook URL (e.g. `https://n8n.yourcompany.com/webhook/wcr-reminder`).
4. Click **Save Configuration**.
5. When triggered, OpsHub dispatches a JSON payload to n8n while simultaneously executing internal fallback handlers for 100% SLA reliability.

---

## 4. Backup & Disaster Recovery Procedures

### PostgreSQL / Supabase Backup Commands
- **Daily Automated Backups**: Configured via Supabase Point-in-Time Recovery (PITR).
- **Manual Database Dump**:
  ```bash
  pg_dump -h db.mwcyapbaedfsjmetnauf.supabase.co -U postgres -d postgres -F c -b -v -f wcr_backup_$(date +%Y%m%m).dump
  ```
- **Database Restore Command**:
  ```bash
  pg_restore -h db.mwcyapbaedfsjmetnauf.supabase.co -U postgres -d postgres -v -c wcr_backup_20260724.dump
  ```

---

## 5. Performance & Error Monitoring

- **Pino Structured Logger**: All backend services log structured JSON logs to stdout and rotating logfiles under `logs/`.
- **Health Check Endpoint**: Available at `/api/health` returning DB connection status, memory utilization, and uptime.
- **Workflow Retry Policy**: Automatic retry up to 3 times on failed workflow executions with exponential backoff.

---

## 6. Sample Onboarding & User Acceptance Testing (UAT) Guide

### Step-by-Step Verification Checklist
1. **Authentication**: Login with test credentials (`admin@ellipsonic.com` / `management@ellipsonic.com`).
2. **Weekly Reporting**: Create a new report draft, fill achievements/blockers, submit report.
3. **Approval Workflow**: Login as Department Head, review submitted report, approve with comments.
4. **Notifications**: Check real-time WebSocket bell notification dropdown and Notification Center (`/notifications`).
5. **Email Automation**: Go to `/settings/email`, click **Send Test Email**, check `/email-logs`.
6. **AI Executive Insights**: Navigate to `/ai-insights`, click **Regenerate Summary**, edit brief, download PDF payload.
7. **Workflow Automation**: Go to `/automations`, click **Run Now** on `Weekly Submission Reminder`, check `/automations/logs`.
