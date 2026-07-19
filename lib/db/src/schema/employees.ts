import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "department_head",
  "employee",
  "management",
]);

export const employeeStatusEnum = pgEnum("employee_status", [
  "active",
  "inactive",
  "on_leave",
]);

export const employeesTable = pgTable("employees", {
  id: uuid("id").primaryKey().defaultRandom(),
  employee_id: text("employee_id").notNull().unique(),
  auth_user_id: text("auth_user_id").unique(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  photo_url: text("photo_url"),
  // department_id references departments - handled at app level to avoid circular
  department_id: uuid("department_id"),
  role: userRoleEnum("role").notNull().default("employee"),
  manager_id: uuid("manager_id"),
  status: employeeStatusEnum("status").notNull().default("active"),
  joining_date: text("joining_date"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
  deleted_at: timestamp("deleted_at"),
});

export const insertEmployeeSchema = createInsertSchema(employeesTable).omit({
  id: true,
  created_at: true,
  updated_at: true,
  deleted_at: true,
});

export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employeesTable.$inferSelect;
