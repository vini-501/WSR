import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const aiSettingsTable = pgTable("ai_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  enabled: boolean("enabled").notNull().default(true),
  provider: text("provider").notNull().default("openai"), // 'openai' | 'gemini' | 'anthropic' | 'custom'
  api_key: text("api_key").notNull().default(""),
  model: text("model").notNull().default("gpt-4o"),
  summary_length: text("summary_length").notNull().default("standard"), // 'concise' | 'standard' | 'detailed'
  tone: text("tone").notNull().default("executive"), // 'executive' | 'professional' | 'technical'
  auto_schedule: text("auto_schedule").notNull().default("weekly_digest"), // 'on_submit' | 'weekly_digest' | 'manual'
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAiSettingsSchema = createInsertSchema(aiSettingsTable).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertAiSettings = z.infer<typeof insertAiSettingsSchema>;
export type AiSettings = typeof aiSettingsTable.$inferSelect;
