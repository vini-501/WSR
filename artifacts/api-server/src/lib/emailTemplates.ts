export interface EmailTemplateData {
  recipientName?: string;
  recipientEmail?: string;
  companyName?: string;
  logoUrl?: string;
  appUrl?: string;
  weekStart?: string;
  reportId?: string;
  reviewerName?: string;
  comment?: string;
  roleName?: string;
  departmentName?: string;
  actionUrl?: string;
  activationToken?: string;
  resetLink?: string;
  stats?: {
    totalEmployees?: number;
    submittedCount?: number;
    approvedCount?: number;
    pendingCount?: number;
    lateCount?: number;
    completionRate?: number;
  };
  customMessage?: string;
  aiExecutiveText?: string;
  aiHealthScore?: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

function getBaseHeader(title: string, companyName: string = "Ellipsonic", logoUrl?: string): string {
  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="${companyName}" style="max-height: 40px; margin-bottom: 12px; display: block;" />`
    : `<div style="font-size: 24px; font-weight: 700; color: #1e293b; letter-spacing: -0.5px;">${companyName} <span style="color: #3b82f6; font-size: 14px; font-weight: 600; background: #eff6ff; padding: 2px 8px; border-radius: 12px;">OpsHub</span></div>`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0;">
          <!-- Header -->
          <tr>
            <td style="padding: 28px 32px 20px 32px; background-color: #ffffff; border-bottom: 1px solid #f1f5f9;">
              ${logoHtml}
              <h1 style="margin: 8px 0 0 0; font-size: 20px; font-weight: 700; color: #0f172a; line-height: 1.3;">${title}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
`;
}

function getBaseFooter(companyName: string = "Ellipsonic", appUrl: string = "http://localhost:5000"): string {
  return `
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b;">
                You received this email because you are registered on <strong>${companyName} WCR OpsHub</strong>.
              </p>
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                &copy; ${new Date().getFullYear()} ${companyName}. All rights reserved. &bull; <a href="${appUrl}" style="color: #3b82f6; text-decoration: none;">Access Application</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

function renderButton(text: string, url: string, color: string = "#2563eb"): string {
  return `
    <table cellpadding="0" cellspacing="0" style="margin: 24px 0;">
      <tr>
        <td align="center" style="border-radius: 10px; background-color: ${color};">
          <a href="${url}" target="_blank" style="font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; display: inline-block; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
            ${text} &rarr;
          </a>
        </td>
      </tr>
    </table>
  `;
}

export function renderEmailTemplate(templateId: string, data: EmailTemplateData): RenderedEmail {
  const company = data.companyName || "Ellipsonic";
  const recipient = data.recipientName || "Team Member";
  const appUrl = data.appUrl || "http://localhost:5000";

  switch (templateId) {
    case "weekly_reminder": {
      const subject = `[Reminder] Submit your Weekly Company Report (WCR) for ${data.weekStart || "this week"}`;
      const html = `${getBaseHeader("Weekly WCR Submission Reminder", company, data.logoUrl)}
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">Hi <strong>${recipient}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">This is a friendly reminder to complete and submit your Weekly Company Report (WCR) for the week of <strong>${data.weekStart || "the current week"}</strong>.</p>
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">Submitting your report on time ensures clear progress tracking across your department and management.</p>
        ${renderButton("Submit WCR Report Now", `${appUrl}/reports/new`)}
        <p style="font-size: 13px; color: #64748b; margin: 0;">Need support or experiencing blockers? Note them down directly in your submission report.</p>
      ${getBaseFooter(company, appUrl)}`;
      const text = `Hi ${recipient}, Please submit your Weekly Report for week ${data.weekStart || "this week"}. Access: ${appUrl}/reports/new`;
      return { subject, html, text };
    }

    case "overdue_reminder": {
      const subject = `[Urgent] Overdue WCR Report Submission for ${data.weekStart || "this week"}`;
      const html = `${getBaseHeader("Action Required: Overdue Report Submission", company, data.logoUrl)}
        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 14px; font-weight: 600; color: #991b1b;">Overdue Submission Alert</p>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #b91c1c;">Your report for week starting <strong>${data.weekStart || "this week"}</strong> has passed the submission deadline.</p>
        </div>
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">Hi <strong>${recipient}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">Please submit your weekly report immediately to avoid delay in department reviews and executive summaries.</p>
        ${renderButton("Submit Overdue Report", `${appUrl}/reports/new`, "#dc2626")}
      ${getBaseFooter(company, appUrl)}`;
      const text = `Hi ${recipient}, Your report for ${data.weekStart || "this week"} is overdue. Please submit now: ${appUrl}/reports/new`;
      return { subject, html, text };
    }

    case "submission_confirmation": {
      const subject = `[Confirmed] Weekly Report Submitted Successfully (${data.weekStart || "WCR"})`;
      const html = `${getBaseHeader("Report Submission Confirmed", company, data.logoUrl)}
        <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 14px; font-weight: 600; color: #166534;">Submission Received</p>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #15803d;">Your report for the week of <strong>${data.weekStart || "current week"}</strong> has been logged in OpsHub.</p>
        </div>
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">Hi <strong>${recipient}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">Thank you for submitting your weekly report! It is currently queueing for review by your Department Head.</p>
        ${data.reportId ? renderButton("View Submitted Report", `${appUrl}/reports/${data.reportId}`) : ""}
      ${getBaseFooter(company, appUrl)}`;
      const text = `Hi ${recipient}, Your weekly report for ${data.weekStart} has been successfully submitted.`;
      return { subject, html, text };
    }

    case "dept_head_review": {
      const subject = `[Review Needed] New WCR Submission by ${recipient} (${data.weekStart || "Weekly"})`;
      const html = `${getBaseHeader("Weekly Report Review Required", company, data.logoUrl)}
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">Hello Department Head,</p>
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;"><strong>${recipient}</strong> has submitted their weekly company report for the week of <strong>${data.weekStart || "the current week"}</strong>.</p>
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">Please review the achievements, ongoing tasks, and blockers to approve or request changes.</p>
        ${data.reportId ? renderButton("Review Report Now", `${appUrl}/reports/${data.reportId}`, "#0d9488") : ""}
      ${getBaseFooter(company, appUrl)}`;
      const text = `Hello, ${recipient} has submitted a WCR for ${data.weekStart}. Review at: ${appUrl}/reports/${data.reportId}`;
      return { subject, html, text };
    }

    case "report_approved": {
      const subject = `[Approved] Your Weekly Report for ${data.weekStart || "this week"} Has Been Approved`;
      const html = `${getBaseHeader("Weekly Report Approved", company, data.logoUrl)}
        <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 14px; font-weight: 600; color: #14532d;">Status: Approved</p>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #166534;">Reviewed by ${data.reviewerName || "your manager"}.</p>
        </div>
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">Hi <strong>${recipient}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">Great work! Your weekly report for <strong>${data.weekStart || "this week"}</strong> has been officially approved.</p>
        ${data.comment ? `<div style="background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px;"><strong style="font-size: 13px; color: #475569;">Reviewer Comment:</strong><p style="margin: 4px 0 0 0; font-size: 14px; font-style: italic; color: #334155;">"${data.comment}"</p></div>` : ""}
        ${data.reportId ? renderButton("View Approved Report", `${appUrl}/reports/${data.reportId}`) : ""}
      ${getBaseFooter(company, appUrl)}`;
      const text = `Hi ${recipient}, Your report for ${data.weekStart} was approved by ${data.reviewerName || "your manager"}.`;
      return { subject, html, text };
    }

    case "report_rejected": {
      const subject = `[Rejected] Weekly Report Update Required (${data.weekStart || "WCR"})`;
      const html = `${getBaseHeader("Weekly Report Rejection Notice", company, data.logoUrl)}
        <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 14px; font-weight: 600; color: #7f1d1d;">Status: Rejected</p>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #991b1b;">Reviewed by ${data.reviewerName || "your manager"}.</p>
        </div>
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">Hi <strong>${recipient}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">Your weekly report for <strong>${data.weekStart || "this week"}</strong> was rejected during review.</p>
        ${data.comment ? `<div style="background: #fff5f5; padding: 16px; border-radius: 8px; border: 1px solid #fed7d7; margin-bottom: 20px;"><strong style="font-size: 13px; color: #9b2c2c;">Reason for Rejection:</strong><p style="margin: 4px 0 0 0; font-size: 14px; color: #742a2a;">"${data.comment}"</p></div>` : ""}
        ${data.reportId ? renderButton("Open Report to Resolve", `${appUrl}/reports/${data.reportId}`, "#dc2626") : ""}
      ${getBaseFooter(company, appUrl)}`;
      const text = `Hi ${recipient}, Your report for ${data.weekStart} was rejected. Reason: ${data.comment || "See application for details"}`;
      return { subject, html, text };
    }

    case "changes_requested": {
      const subject = `[Action Required] Changes Requested on WCR Report (${data.weekStart || "Weekly"})`;
      const html = `${getBaseHeader("Changes Requested on Report", company, data.logoUrl)}
        <div style="background-color: #fffbebfb; border-left: 4px solid #d97706; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 14px; font-weight: 600; color: #78350f;">Status: Needs Changes</p>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #92400e;">Feedback provided by ${data.reviewerName || "your reviewer"}.</p>
        </div>
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">Hi <strong>${recipient}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">Your reviewer has requested minor updates to your weekly report before approval.</p>
        ${data.comment ? `<div style="background: #fffbeb; padding: 16px; border-radius: 8px; border: 1px solid #fef3c7; margin-bottom: 20px;"><strong style="font-size: 13px; color: #92400e;">Feedback & Notes:</strong><p style="margin: 4px 0 0 0; font-size: 14px; color: #78350f;">"${data.comment}"</p></div>` : ""}
        ${data.reportId ? renderButton("Edit & Resubmit Report", `${appUrl}/reports/${data.reportId}`, "#d97706") : ""}
      ${getBaseFooter(company, appUrl)}`;
      const text = `Hi ${recipient}, Changes were requested on your report for ${data.weekStart}. Feedback: ${data.comment || "See application"}`;
      return { subject, html, text };
    }

    case "report_resubmitted": {
      const subject = `[Resubmitted] Report Resubmission for ${data.weekStart || "WCR"} by ${recipient}`;
      const html = `${getBaseHeader("Report Resubmitted for Review", company, data.logoUrl)}
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">Hello Department Head,</p>
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;"><strong>${recipient}</strong> has updated and resubmitted their weekly report for the week of <strong>${data.weekStart || "the current week"}</strong>.</p>
        ${data.reportId ? renderButton("Review Resubmitted Report", `${appUrl}/reports/${data.reportId}`, "#2563eb") : ""}
      ${getBaseFooter(company, appUrl)}`;
      const text = `Hello, ${recipient} has resubmitted their report for ${data.weekStart}. Access: ${appUrl}/reports/${data.reportId}`;
      return { subject, html, text };
    }

    case "dept_completion_summary": {
      const subject = `[Department Summary] ${data.departmentName || "Department"} Weekly Submission Status`;
      const html = `${getBaseHeader(`Weekly Summary: ${data.departmentName || "Department"}`, company, data.logoUrl)}
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">Hello <strong>${recipient}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">Here is the weekly report completion breakdown for department <strong>${data.departmentName || "your team"}</strong> for the week of <strong>${data.weekStart || "this week"}</strong>:</p>
        <table width="100%" cellpadding="12" cellspacing="0" style="border-collapse: collapse; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
          <tr>
            <td style="border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #64748b;">Submitted & Approved:</td>
            <td style="border-bottom: 1px solid #e2e8f0; font-size: 16px; font-weight: 700; color: #16a34a;" align="right">${data.stats?.approvedCount ?? 0}</td>
          </tr>
          <tr>
            <td style="border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #64748b;">Pending Review:</td>
            <td style="border-bottom: 1px solid #e2e8f0; font-size: 16px; font-weight: 700; color: #d97706;" align="right">${data.stats?.pendingCount ?? 0}</td>
          </tr>
          <tr>
            <td style="font-size: 14px; color: #64748b;">Overall Completion Rate:</td>
            <td style="font-size: 16px; font-weight: 700; color: #2563eb;" align="right">${data.stats?.completionRate ?? 100}%</td>
          </tr>
        </table>
        ${renderButton("Open Management Dashboard", `${appUrl}/management`)}
      ${getBaseFooter(company, appUrl)}`;
      const text = `Department summary for ${data.departmentName}: ${data.stats?.approvedCount} approved, ${data.stats?.pendingCount} pending.`;
      return { subject, html, text };
    }

    case "executive_summary": {
      const subject = `[AI Executive Summary] Weekly Company Performance & Insights (${data.weekStart || "Week"})`;
      const aiBlock = data.aiExecutiveText ? `
        <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #6366f1; border-radius: 8px; padding: 18px; margin-bottom: 24px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
            <strong style="font-size: 14px; color: #4338ca;">🤖 AI Business Brief & Health Score</strong>
            ${data.aiHealthScore ? `<span style="background: #e0e7ff; color: #3730a3; font-size: 11px; font-weight: bold; padding: 3px 10px; border-radius: 12px;">Health: ${data.aiHealthScore}</span>` : ""}
          </div>
          <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0;">${data.aiExecutiveText}</p>
        </div>
      ` : "";

      const html = `${getBaseHeader("Company Executive Summary & AI Insights", company, data.logoUrl)}
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">Hello Executive Team,</p>
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">Below is the executive summary overview and AI business intelligence for week starting <strong>${data.weekStart || "this week"}</strong>:</p>
        
        ${aiBlock}

        <table width="100%" cellpadding="12" cellspacing="0" style="border-collapse: collapse; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
          <tr>
            <td style="border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #64748b;">Total Active Workforce:</td>
            <td style="border-bottom: 1px solid #e2e8f0; font-size: 16px; font-weight: 700; color: #0f172a;" align="right">${data.stats?.totalEmployees ?? 0}</td>
          </tr>
          <tr>
            <td style="border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #64748b;">Reports Submitted:</td>
            <td style="border-bottom: 1px solid #e2e8f0; font-size: 16px; font-weight: 700; color: #16a34a;" align="right">${data.stats?.submittedCount ?? 0}</td>
          </tr>
          <tr>
            <td style="border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #64748b;">Approved Reports:</td>
            <td style="border-bottom: 1px solid #e2e8f0; font-size: 16px; font-weight: 700; color: #2563eb;" align="right">${data.stats?.approvedCount ?? 0}</td>
          </tr>
          <tr>
            <td style="font-size: 14px; color: #64748b;">Overall Company Completion:</td>
            <td style="font-size: 16px; font-weight: 700; color: #0d9488;" align="right">${data.stats?.completionRate ?? 100}%</td>
          </tr>
        </table>
        ${renderButton("View Interactive AI Dashboard", `${appUrl}/ai-insights`, "#4f46e5")}
      ${getBaseFooter(company, appUrl)}`;
      const text = `Executive summary for ${data.weekStart}: ${data.stats?.completionRate}% company completion rate. Access AI Insights at: ${appUrl}/ai-insights`;
      return { subject, html, text };
    }

    case "pending_approval_summary": {
      const subject = `[Pending Approvals] ${data.stats?.pendingCount ?? 0} WCR Reports Awaiting Your Review`;
      const html = `${getBaseHeader("Pending Approvals Summary", company, data.logoUrl)}
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">Hi <strong>${recipient}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">You currently have <strong>${data.stats?.pendingCount ?? 0}</strong> submitted weekly report(s) awaiting your review and approval.</p>
        ${renderButton("Review Pending Reports", `${appUrl}/management`, "#0d9488")}
      ${getBaseFooter(company, appUrl)}`;
      const text = `Hi ${recipient}, You have ${data.stats?.pendingCount} reports pending approval. Access: ${appUrl}/management`;
      return { subject, html, text };
    }

    case "late_submission_summary": {
      const subject = `[Late Alert] ${data.stats?.lateCount ?? 0} Unsubmitted WCR Reports Identified`;
      const html = `${getBaseHeader("Late Submissions Alert Summary", company, data.logoUrl)}
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">Hello Management,</p>
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">There are currently <strong>${data.stats?.lateCount ?? 0}</strong> employees who have not submitted their weekly reports for the week of <strong>${data.weekStart || "this week"}</strong>.</p>
        ${renderButton("View Reporting Status", `${appUrl}/management`, "#dc2626")}
      ${getBaseFooter(company, appUrl)}`;
      const text = `Management Alert: ${data.stats?.lateCount} employees are late submitting reports for ${data.weekStart}.`;
      return { subject, html, text };
    }

    case "welcome_email": {
      const subject = `Welcome to ${company} OpsHub!`;
      const html = `${getBaseHeader(`Welcome to ${company}`, company, data.logoUrl)}
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">Hi <strong>${recipient}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">Welcome aboard! Your employee profile has been created on <strong>${company} WCR OpsHub</strong>.</p>
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">You can now log in, submit weekly reporting achievements, track progress, and view department activity.</p>
        ${renderButton("Log In to OpsHub", appUrl)}
      ${getBaseFooter(company, appUrl)}`;
      const text = `Welcome ${recipient}! Log in to OpsHub at ${appUrl}`;
      return { subject, html, text };
    }

    case "account_activation": {
      const subject = `Activate Your ${company} OpsHub Account`;
      const html = `${getBaseHeader("Account Activation Instructions", company, data.logoUrl)}
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">Hi <strong>${recipient}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">An account has been created for you. Click the button below to set up your password and activate your account.</p>
        ${renderButton("Activate Account Now", `${appUrl}/activate?token=${data.activationToken || ""}`, "#16a34a")}
      ${getBaseFooter(company, appUrl)}`;
      const text = `Hi ${recipient}, Activate your account: ${appUrl}/activate?token=${data.activationToken || ""}`;
      return { subject, html, text };
    }

    case "password_reset": {
      const subject = `Password Reset Request - ${company} OpsHub`;
      const html = `${getBaseHeader("Password Reset Request", company, data.logoUrl)}
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">Hi <strong>${recipient}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">We received a request to reset your password. Click below to specify a new password:</p>
        ${renderButton("Reset Password", data.resetLink || `${appUrl}/reset-password`, "#dc2626")}
        <p style="font-size: 13px; color: #64748b;">If you did not request this, please ignore this email.</p>
      ${getBaseFooter(company, appUrl)}`;
      const text = `Reset password link: ${data.resetLink || appUrl}`;
      return { subject, html, text };
    }

    case "role_update": {
      const subject = `[Notice] Profile Role Updated to ${data.roleName || "New Role"}`;
      const html = `${getBaseHeader("Account Role Updated", company, data.logoUrl)}
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">Hi <strong>${recipient}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">Your role on <strong>${company} WCR OpsHub</strong> has been updated to <strong>${data.roleName || "updated role"}</strong>.</p>
        ${renderButton("Access Dashboard", appUrl)}
      ${getBaseFooter(company, appUrl)}`;
      const text = `Hi ${recipient}, Your role has been updated to ${data.roleName}.`;
      return { subject, html, text };
    }

    case "department_transfer": {
      const subject = `[Notice] Department Transfer: ${data.departmentName || "New Department"}`;
      const html = `${getBaseHeader("Department Transfer Notification", company, data.logoUrl)}
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">Hi <strong>${recipient}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">You have been assigned to the department: <strong>${data.departmentName || "New Department"}</strong>.</p>
        ${renderButton("View Department Dashboard", `${appUrl}/departments`)}
      ${getBaseFooter(company, appUrl)}`;
      const text = `Hi ${recipient}, You have been reassigned to department: ${data.departmentName}.`;
      return { subject, html, text };
    }

    default: {
      const subject = `Notification from ${company} OpsHub`;
      const html = `${getBaseHeader("System Notification", company, data.logoUrl)}
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">Hi <strong>${recipient}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">${data.customMessage || "You have a new update in your WCR portal."}</p>
        ${renderButton("Open OpsHub", appUrl)}
      ${getBaseFooter(company, appUrl)}`;
      const text = `Hi ${recipient}, ${data.customMessage || "You have a new notification on OpsHub."}`;
      return { subject, html, text };
    }
  }
}
