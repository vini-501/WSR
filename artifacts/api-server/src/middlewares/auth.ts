import { createClient } from "@supabase/supabase-js";
import type { Request, Response, NextFunction } from "express";
import { db, employeesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
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

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

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

  try {
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    const [employee] = await db
      .select()
      .from(employeesTable)
      .where(eq(employeesTable.auth_user_id, user.id))
      .limit(1);

    if (!employee) {
      res.status(401).json({ error: "User account not found" });
      return;
    }

    if (employee.status !== "active") {
      res.status(403).json({ error: "Account is not active" });
      return;
    }

    req.user = employee;
    next();
  } catch (err) {
    res.status(401).json({ error: "Authentication failed" });
  }
}
