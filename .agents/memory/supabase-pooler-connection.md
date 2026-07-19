---
name: Supabase DB connection from Replit
description: How to connect to Supabase PostgreSQL from the Replit container (DNS workaround)
---

## Rule
Replit containers cannot resolve `db.[project-ref].supabase.co` (direct connection) via DNS. Always use the Supabase **transaction pooler** instead.

**Pooler host:** `aws-0-ap-northeast-1.pooler.supabase.com` (port 6543)
**User format:** `postgres.[project-ref]` (e.g. `postgres.mwcyapbaedfsjmetnauf`)
**SSL:** `{ rejectUnauthorized: false }`

The lib/db/src/index.ts and drizzle.config.ts both auto-detect a direct-connection URL (starting with `db.*.supabase.co`) and rewrite it to the pooler URL automatically.

**Why:** `db.[project].supabase.co:5432` is ENOTFOUND from Replit. The transaction pooler on `ap-northeast-1` resolves and accepts connections. Other regions also resolve but return "tenant not found" errors for this project.

**How to apply:** Any time a new Supabase project is connected, verify the pooler region with the auto-detection logic in db/src/index.ts. If the project moves regions, test all regions with the tenant-not-found approach.
