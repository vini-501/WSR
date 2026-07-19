import type { Request, Response, NextFunction } from "express";

type Role = "admin" | "department_head" | "employee" | "management";

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!roles.includes(req.user.role as Role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
}

export const ADMIN_ONLY = requireRole("admin");
export const MANAGEMENT_AND_ADMIN = requireRole("admin", "management");
export const DEPT_HEAD_AND_ABOVE = requireRole(
  "admin",
  "management",
  "department_head"
);
