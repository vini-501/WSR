import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const rawUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!rawUrl) {
  throw new Error(
    "SUPABASE_DATABASE_URL must be set. Check your Supabase credentials.",
  );
}

/**
 * Auto-converts a Supabase direct DB URL (db.*.supabase.co:5432) into the
 * transaction pooler URL (aws-0-ap-northeast-1.pooler.supabase.com:6543)
 * which resolves correctly from the Replit network environment.
 */
function getConnectionUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.startsWith("db.") && u.hostname.endsWith(".supabase.co")) {
      const projectRef = u.hostname
        .replace("db.", "")
        .replace(".supabase.co", "");
      const poolerHost = "aws-0-ap-northeast-1.pooler.supabase.com";
      const poolerUser = `postgres.${projectRef}`;
      const newUrl = new URL(url);
      newUrl.hostname = poolerHost;
      newUrl.port = "6543";
      newUrl.username = poolerUser;
      return newUrl.toString();
    }
  } catch {
    // Fall through to original URL if parsing fails
  }
  return url;
}

const dbUrl = getConnectionUrl(rawUrl);

export const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });

export * from "./schema";
