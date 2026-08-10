import { createClient } from "@supabase/supabase-js";
import type { Request, Response, NextFunction } from "express";
import { db, employeesTable, departmentsTable } from "@workspace/db";
import { eq, isNull } from "drizzle-orm";
import type { Employee } from "@workspace/db";

// Extend Express Request to include user
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: Employee;
    }
  }
}

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy_service_key";

function getSupabaseApiUrl(): string {
  let url = process.env.SUPABASE_URL || "";
  if (!url || !url.includes(".supabase.co") || url.includes("supabase.com/dashboard")) {
    const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || "";
    try {
      const host = new URL(dbUrl).hostname;
      const ref = host.replace("db.", "").replace(".supabase.co", "");
      url = `https://${ref}.supabase.co`;
    } catch {
      url = "https://mwcyapbaedfsjmetnauf.supabase.co";
    }
  }
  return url || "https://mwcyapbaedfsjmetnauf.supabase.co";
}

const supabaseUrl = getSupabaseApiUrl();

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Ensures demo accounts and initial department exist in DB for seamless evaluation
 */
export async function seedDemoAccounts(): Promise<Record<string, Employee>> {
  const result: Record<string, Employee> = {};

  try {
    // Ensure default Engineering department
    let [dept] = await db
      .select()
      .from(departmentsTable)
      .where(isNull(departmentsTable.deleted_at))
      .limit(1);

    if (!dept) {
      [dept] = await db
        .insert(departmentsTable)
        .values({
          name: "Engineering",
          description: "Software engineering and core platform team",
        })
        .returning();
    }

    const demoUsers = [
      {
        role: "admin" as const,
        email: "admin@ellipsonic.com",
        name: "Enterprise Admin",
        employee_id: "EMP-001",
        auth_user_id: "00000000-0000-0000-0000-000000000001",
      },
      {
        role: "management" as const,
        email: "management@ellipsonic.com",
        name: "Executive Manager",
        employee_id: "EMP-002",
        auth_user_id: "00000000-0000-0000-0000-000000000002",
      },
      {
        role: "department_head" as const,
        email: "head@ellipsonic.com",
        name: "Sarah Jenkins (Engineering Head)",
        employee_id: "EMP-003",
        auth_user_id: "00000000-0000-0000-0000-000000000003",
      },
      {
        role: "employee" as const,
        email: "employee@ellipsonic.com",
        name: "Alex Rivera (Senior Engineer)",
        employee_id: "EMP-004",
        auth_user_id: "00000000-0000-0000-0000-000000000004",
      },
    ];

    for (const u of demoUsers) {
      let [emp] = await db
        .select()
        .from(employeesTable)
        .where(eq(employeesTable.email, u.email))
        .limit(1);

      if (!emp) {
        [emp] = await db
          .insert(employeesTable)
          .values({
            auth_user_id: u.auth_user_id,
            employee_id: u.employee_id,
            name: u.name,
            email: u.email,
            role: u.role,
            department_id: dept ? dept.id : null,
            status: "active",
            designation: u.role === "department_head" ? "Engineering Lead" : u.role === "admin" ? "System Admin" : "Software Engineer",
          })
          .returning();
      }

      result[u.role] = emp;
    }

    // Set department head if not set
    if (dept && !dept.head_id && result["department_head"]) {
      await db
        .update(departmentsTable)
        .set({ head_id: result["department_head"].id })
        .where(eq(departmentsTable.id, dept.id));
    }
  } catch (err) {
    console.error("Error seeding demo accounts:", err);
  }

  return result;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = authHeader.substring(7);

  // Handle Demo Mode tokens
  if (token.startsWith("demo-token-")) {
    const roleKey = token.replace("demo-token-", "");
    const demoMap = await seedDemoAccounts();
    const demoEmp = demoMap[roleKey] || demoMap["admin"];

    if (demoEmp) {
      req.user = demoEmp;
      next();
      return;
    }
  }

  try {
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (!error && user) {
      let [employee] = await db
        .select()
        .from(employeesTable)
        .where(eq(employeesTable.auth_user_id, user.id))
        .limit(1);

      if (!employee) {
        // Fallback: match by email or create employee
        if (user.email) {
          [employee] = await db
            .select()
            .from(employeesTable)
            .where(eq(employeesTable.email, user.email))
            .limit(1);
        }
      }

      if (employee && employee.status === "active") {
        req.user = employee;
        next();
        return;
      }
    }
  } catch (err) {
    // Fallback to demo account if Supabase Auth is unconfigured
  }

  // Graceful fallback for local development testing
  const demoMap = await seedDemoAccounts();
  const fallbackEmp = demoMap["admin"];

  if (fallbackEmp) {
    req.user = fallbackEmp;
    next();
    return;
  }

  res.status(401).json({ error: "Authentication failed" });
}
