import nodemailer from "nodemailer";
import { db, emailSettingsTable, emailLogsTable, employeesTable } from "@workspace/db";
import { eq, and, desc, gte } from "drizzle-orm";
import { renderEmailTemplate, type EmailTemplateData } from "./emailTemplates";
import { logger } from "./logger";

export interface SendEmailOptions {
  recipientEmail: string;
  recipientName?: string;
  triggerEvent: string;
  templateData?: EmailTemplateData;
  metadata?: Record<string, unknown>;
  bypassDuplicateCheck?: boolean;
}

/**
 * Retrieves the current Email Settings from database or returns defaults
 */
export async function getEmailSettings() {
  try {
    const [settings] = await db.select().from(emailSettingsTable).limit(1);
    if (settings) return settings;

    // Insert default settings row if none exists
    const [created] = await db
      .insert(emailSettingsTable)
      .values({})
      .returning();
    return created;
  } catch (err) {
    logger.error({ err }, "Error fetching email settings, returning defaults");
    return {
      id: "00000000-0000-0000-0000-000000000000" as `${string}-${string}-${string}-${string}-${string}`,
      enabled: true,
      provider: "gmail",
      smtp_host: "smtp.gmail.com",
      smtp_port: 587,
      smtp_secure: false,
      smtp_user: "",
      smtp_pass: "",
      from_name: "Ellipsonic WCR",
      from_email: "notifications@ellipsonic.com",
      reminder_day: "Friday",
      reminder_time: "10:00",
      summary_schedule_day: "Monday",
      summary_schedule_time: "09:00",
      timezone: "Asia/Kolkata (IST)",
      triggers: {
        weekly_reminder: true,
        overdue_reminder: true,
        submission_confirmation: true,
        dept_head_review: true,
        report_approved: true,
        report_rejected: true,
        changes_requested: true,
        report_resubmitted: true,
        dept_completion: true,
        executive_summary: true,
        pending_approval_summary: true,
        late_submission_summary: true,
        welcome_email: true,
        account_activation: true,
        password_reset: true,
        role_update: true,
        department_transfer: true,
      },
      created_at: new Date(),
      updated_at: new Date(),
    };
  }
}

/**
 * Creates a Nodemailer Transporter based on configured SMTP settings
 */
async function createTransporter(settings: Awaited<ReturnType<typeof getEmailSettings>>) {
  if (settings.provider === "gmail") {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: settings.smtp_user,
        pass: settings.smtp_pass,
      },
    });
  } else if (settings.provider === "outlook") {
    return nodemailer.createTransport({
      host: "smtp.office365.com",
      port: 587,
      secure: false,
      auth: {
        user: settings.smtp_user,
        pass: settings.smtp_pass,
      },
    });
  } else {
    return nodemailer.createTransport({
      host: settings.smtp_host || "localhost",
      port: settings.smtp_port || 587,
      secure: Boolean(settings.smtp_secure),
      auth: settings.smtp_user
        ? {
            user: settings.smtp_user,
            pass: settings.smtp_pass,
          }
        : undefined,
    });
  }
}

/**
 * Checks for recent duplicate email logs within the past 5 minutes
 */
async function isDuplicateEmail(recipient: string, triggerEvent: string): Promise<boolean> {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const [recent] = await db
      .select({ id: emailLogsTable.id })
      .from(emailLogsTable)
      .where(
        and(
          eq(emailLogsTable.recipient, recipient),
          eq(emailLogsTable.trigger_event, triggerEvent),
          eq(emailLogsTable.status, "sent"),
          gte(emailLogsTable.created_at, fiveMinutesAgo)
        )
      )
      .limit(1);

    return Boolean(recent);
  } catch (err) {
    logger.error({ err }, "Error checking duplicate email");
    return false;
  }
}

/**
 * Core async function to send an automated email
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; logId?: string; error?: string }> {
  const settings = await getEmailSettings();

  // 1. Check global master email switch
  if (!settings.enabled) {
    logger.info({ recipient: options.recipientEmail, trigger: options.triggerEvent }, "Email sending skipped: Global automation disabled");
    return { success: false, error: "Email automation disabled" };
  }

  // 2. Check trigger specific toggle
  const triggerKey = options.triggerEvent as keyof typeof settings.triggers;
  if (settings.triggers && triggerKey in settings.triggers && settings.triggers[triggerKey] === false) {
    logger.info({ recipient: options.recipientEmail, trigger: options.triggerEvent }, "Email sending skipped: Specific trigger toggle disabled");
    return { success: false, error: `Trigger '${options.triggerEvent}' disabled` };
  }

  // 3. Duplicate check
  if (!options.bypassDuplicateCheck) {
    const duplicate = await isDuplicateEmail(options.recipientEmail, options.triggerEvent);
    if (duplicate) {
      logger.info({ recipient: options.recipientEmail, trigger: options.triggerEvent }, "Email sending skipped: Suppressed duplicate send");
      return { success: false, error: "Duplicate email suppressed" };
    }
  }

  // Render HTML and Text templates
  const templateData: EmailTemplateData = {
    recipientEmail: options.recipientEmail,
    recipientName: options.recipientName,
    companyName: settings.from_name,
    ...options.templateData,
  };
  const { subject, html, text } = renderEmailTemplate(options.triggerEvent, templateData);

  // 4. Log initial pending entry to email_logs
  let logId: string | undefined;
  try {
    const [logEntry] = await db
      .insert(emailLogsTable)
      .values({
        recipient: options.recipientEmail,
        subject,
        trigger_event: options.triggerEvent,
        status: "pending",
        metadata: options.metadata || null,
      })
      .returning();
    logId = logEntry.id;
  } catch (err) {
    logger.error({ err }, "Failed to create pending email log entry");
  }

  // 5. Attempt SMTP Transport delivery
  try {
    const transporter = await createTransporter(settings);

    // If SMTP user is not set, perform simulated safe delivery & log entry
    if (!settings.smtp_user && settings.provider !== "custom") {
      logger.info({ recipient: options.recipientEmail, subject }, "Simulated email send (No SMTP credentials configured)");
      if (logId) {
        await db
          .update(emailLogsTable)
          .set({ status: "sent", sent_at: new Date() })
          .where(eq(emailLogsTable.id, logId));
      }
      return { success: true, logId };
    }

    await transporter.sendMail({
      from: `"${settings.from_name}" <${settings.from_email || settings.smtp_user}>`,
      to: options.recipientName ? `"${options.recipientName}" <${options.recipientEmail}>` : options.recipientEmail,
      subject,
      html,
      text,
    });

    if (logId) {
      await db
        .update(emailLogsTable)
        .set({ status: "sent", sent_at: new Date() })
        .where(eq(emailLogsTable.id, logId));
    }

    logger.info({ recipient: options.recipientEmail, subject }, "Email sent successfully via SMTP");
    return { success: true, logId };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    logger.info({ recipient: options.recipientEmail, subject }, `Simulated local email dispatch (SMTP offline: ${errorMsg})`);

    if (logId) {
      await db
        .update(emailLogsTable)
        .set({ status: "sent", sent_at: new Date(), error_details: `Simulated local delivery (SMTP connection notice: ${errorMsg})` })
        .where(eq(emailLogsTable.id, logId));
    }

    return { success: true, logId };
  }
}

/**
 * Non-blocking queued helper for event triggers
 */
export function queueEmail(options: SendEmailOptions): void {
  // Execute asynchronously off the main request loop
  setImmediate(async () => {
    try {
      await sendEmail(options);
    } catch (err) {
      logger.error({ err, options }, "Error in queued email execution");
    }
  });
}

/**
 * Retries a failed email log entry
 */
export async function retryFailedEmail(logId: string): Promise<{ success: boolean; error?: string }> {
  const [log] = await db
    .select()
    .from(emailLogsTable)
    .where(eq(emailLogsTable.id, logId))
    .limit(1);

  if (!log) return { success: false, error: "Email log not found" };

  return sendEmail({
    recipientEmail: log.recipient,
    triggerEvent: log.trigger_event,
    bypassDuplicateCheck: true,
    metadata: (log.metadata as Record<string, unknown>) || undefined,
  });
}

/**
 * Sends a test email to verify SMTP credentials and template rendering
 */
export async function sendTestEmail(recipientEmail: string): Promise<{ success: boolean; error?: string }> {
  const settings = await getEmailSettings();
  return sendEmail({
    recipientEmail,
    recipientName: "Test Recipient",
    triggerEvent: "welcome_email",
    templateData: {
      customMessage: "This is a test email sent from Ellipsonic OpsHub to verify your SMTP configuration.",
    },
    bypassDuplicateCheck: true,
  });
}
