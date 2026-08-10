import type { Request, Response } from "express";
import app from "../artifacts/api-server/src/app";
import { ensureSupabaseAuthUsers } from "../artifacts/api-server/src/utils/seedAuth";
import { seedComprehensiveEnterpriseData } from "../artifacts/api-server/src/utils/seedComprehensiveData";

let isInitializing = false;

async function runColdStartInit() {
  try {
    await ensureSupabaseAuthUsers();
    await seedComprehensiveEnterpriseData();
  } catch (err) {
    console.error("Vercel cold-start initialization warning:", err);
  }
}

export default function handler(req: Request, res: Response) {
  if (!isInitializing) {
    isInitializing = true;
    runColdStartInit().catch((err) => {
      console.error("Background seeding failed:", err);
    });
  }
  return app(req, res);
}
