import { defineConfig } from "drizzle-kit";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rawUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
if (!rawUrl) {
  throw new Error("SUPABASE_DATABASE_URL or DATABASE_URL must be set");
}

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
    // Fall through
  }
  return url;
}

export default defineConfig({
  schema: join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: getConnectionUrl(rawUrl),
  },
});
