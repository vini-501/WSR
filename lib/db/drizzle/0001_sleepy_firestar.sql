ALTER TYPE "public"."employee_status" ADD VALUE 'resigned';--> statement-breakpoint
ALTER TYPE "public"."report_status" ADD VALUE 'under_review' BEFORE 'approved';--> statement-breakpoint
CREATE TABLE "email_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"provider" text DEFAULT 'gmail' NOT NULL,
	"smtp_host" text DEFAULT 'smtp.gmail.com' NOT NULL,
	"smtp_port" integer DEFAULT 587 NOT NULL,
	"smtp_secure" boolean DEFAULT false NOT NULL,
	"smtp_user" text DEFAULT '' NOT NULL,
	"smtp_pass" text DEFAULT '' NOT NULL,
	"from_name" text DEFAULT 'Ellipsonic WCR' NOT NULL,
	"from_email" text DEFAULT 'notifications@ellipsonic.com' NOT NULL,
	"reminder_day" text DEFAULT 'Friday' NOT NULL,
	"reminder_time" text DEFAULT '10:00' NOT NULL,
	"summary_schedule_day" text DEFAULT 'Monday' NOT NULL,
	"summary_schedule_time" text DEFAULT '09:00' NOT NULL,
	"timezone" text DEFAULT 'Asia/Kolkata (IST)' NOT NULL,
	"triggers" jsonb DEFAULT '{"weekly_reminder":true,"overdue_reminder":true,"submission_confirmation":true,"dept_head_review":true,"report_approved":true,"report_rejected":true,"changes_requested":true,"report_resubmitted":true,"dept_completion":true,"executive_summary":true,"pending_approval_summary":true,"late_submission_summary":true,"welcome_email":true,"account_activation":true,"password_reset":true,"role_update":true,"department_transfer":true}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient" text NOT NULL,
	"subject" text NOT NULL,
	"trigger_event" text NOT NULL,
	"status" text DEFAULT 'sent' NOT NULL,
	"error_details" text,
	"metadata" jsonb,
	"sent_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"provider" text DEFAULT 'openai' NOT NULL,
	"api_key" text DEFAULT '' NOT NULL,
	"model" text DEFAULT 'gpt-4o' NOT NULL,
	"summary_length" text DEFAULT 'standard' NOT NULL,
	"tone" text DEFAULT 'executive' NOT NULL,
	"auto_schedule" text DEFAULT 'weekly_digest' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"target_id" text NOT NULL,
	"reporting_week" text NOT NULL,
	"summary_data" jsonb NOT NULL,
	"ai_provider_used" text DEFAULT 'system_engine' NOT NULL,
	"ai_model_used" text DEFAULT 'heuristic_v1' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"generated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"description" text NOT NULL,
	"trigger_type" text DEFAULT 'cron' NOT NULL,
	"schedule_cron" text DEFAULT '0 10 * * 5' NOT NULL,
	"n8n_webhook_url" text DEFAULT '' NOT NULL,
	"n8n_workflow_id" text DEFAULT '' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_run_at" timestamp,
	"next_run_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workflows_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "workflow_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid,
	"workflow_name" text NOT NULL,
	"trigger_source" text DEFAULT 'scheduled_cron' NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"start_time" timestamp DEFAULT now() NOT NULL,
	"end_time" timestamp,
	"execution_time_ms" integer DEFAULT 0 NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"error_details" text,
	"payload" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "escalations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"employee_name" text NOT NULL,
	"report_id" uuid,
	"week_start" text NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"escalated_to_id" uuid,
	"escalated_to_name" text,
	"notes" text,
	"escalated_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company_settings" ALTER COLUMN "timezone" SET DEFAULT 'Asia/Kolkata (IST)';--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "designation" text;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "employment_type" text;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "timezone" text;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "work_location" text;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "weekly_reporting_frequency" integer;--> statement-breakpoint
ALTER TABLE "weekly_reports" ADD COLUMN "ongoing_tasks" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "weekly_reports" ADD COLUMN "support_needed" text;--> statement-breakpoint
ALTER TABLE "weekly_reports" ADD COLUMN "overall_progress" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_email_logs_recipient" ON "email_logs" USING btree ("recipient");--> statement-breakpoint
CREATE INDEX "idx_email_logs_status" ON "email_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_email_logs_trigger" ON "email_logs" USING btree ("trigger_event");--> statement-breakpoint
CREATE INDEX "idx_email_logs_created_at" ON "email_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_ai_summaries_type_target" ON "ai_summaries" USING btree ("type","target_id");--> statement-breakpoint
CREATE INDEX "idx_ai_summaries_reporting_week" ON "ai_summaries" USING btree ("reporting_week");--> statement-breakpoint
CREATE INDEX "idx_ai_summaries_created_at" ON "ai_summaries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_workflow_logs_workflow_id" ON "workflow_logs" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "idx_workflow_logs_status" ON "workflow_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_workflow_logs_created_at" ON "workflow_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_escalations_employee_id" ON "escalations" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_escalations_week_start" ON "escalations" USING btree ("week_start");--> statement-breakpoint
CREATE INDEX "idx_escalations_status" ON "escalations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_id" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_unread" ON "notifications" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE INDEX "idx_notifications_created_at" ON "notifications" USING btree ("created_at");