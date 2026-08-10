import pg from 'pg';

const rawUrl = process.env.DATABASE_URL;
console.log("Raw URL:", rawUrl);

function getConnectionUrl(url) {
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
  } catch (e) {
    console.error("Parse error:", e);
  }
  return url;
}

const poolerUrl = getConnectionUrl(rawUrl);
console.log("Converted Pooler URL:", poolerUrl);

async function testConnection(url, label) {
  if (!url) {
    console.log(`No URL provided for ${label}`);
    return;
  }
  console.log(`\nTesting connection for: ${label}...`);
  const pool = new pg.Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
  });
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT NOW()');
    console.log(`Success! Server time: ${res.rows[0].now}`);
    client.release();
  } catch (err) {
    console.error(`Failed: ${err.message}`);
  } finally {
    await pool.end();
  }
}

async function run() {
  await testConnection(rawUrl, "Direct URL");
  await testConnection(poolerUrl, "Pooler URL");
}

run();
